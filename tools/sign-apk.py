#!/usr/bin/env python3
"""Assina um APK em Python puro (sem Android SDK): esquemas v1 (JAR) e v2.

Uso:
  python3 tools/sign-apk.py entrada-unsigned.apk saida-assinado.apk \
          [--key tools/vida-brasil-debug-key.pem] [--cert tools/vida-brasil-debug-cert.pem]

Se a chave/certificado não existirem, um par debug é gerado automaticamente
(RSA-2048, CN="Vida Brasil Debug", validade de 30 anos) e salvo para reuso —
mantenha os mesmos arquivos para atualizações futuras do app.

Implementa:
  • v1 (JAR Signing): META-INF/MANIFEST.MF + CERT.SF + CERT.RSA (PKCS7 destacado)
  • v2 (APK Signature Scheme v2): bloco de assinatura ID 0x7109871a, algoritmo
    RSASSA-PKCS1-v1_5 com SHA-256 (0x0103), digests em chunks de 1 MiB
  • zipalign: entradas não-comprimidas alinhadas em 4 bytes (exigido p/ targetSdk 30+)
"""
import argparse
import base64
import datetime
import hashlib
import os
import struct
import sys
import time
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs7
from cryptography.x509.oid import NameOID

# -----------------------------------------------------------------------------
# chaves / certificado
# -----------------------------------------------------------------------------

def garantir_chave_e_cert(caminho_key, caminho_cert):
    """Carrega (ou gera) a chave RSA e o certificado autoassinado."""
    if os.path.exists(caminho_key) and os.path.exists(caminho_cert):
        with open(caminho_key, "rb") as f:
            chave = serialization.load_pem_private_key(f.read(), password=None)
        with open(caminho_cert, "rb") as f:
            cert = x509.load_pem_x509_certificate(f.read())
        return chave, cert

    print("🔑 Gerando par de chaves debug (RSA-2048)…")
    chave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    nome = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"Vida Brasil Debug"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Vida Brasil"),
    ])
    agora = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(nome)
        .issuer_name(nome)
        .public_key(chave.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(agora - datetime.timedelta(days=1))
        .not_valid_after(agora + datetime.timedelta(days=30 * 365))
        .sign(chave, hashes.SHA256())
    )
    with open(caminho_key, "wb") as f:
        f.write(chave.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))
    with open(caminho_cert, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print(f"   chave: {caminho_key}\n   cert:  {caminho_cert}")
    return chave, cert


# -----------------------------------------------------------------------------
# ZIP de baixo nível (leitura de estruturas + escrita alinhada)
# -----------------------------------------------------------------------------

def ler_entradas_zip(caminho):
    """Lê todas as entradas de um zip, preservando método e metadados."""
    entradas = []
    with zipfile.ZipFile(caminho) as z:
        for info in z.infolist():
            dados = z.read(info.filename)
            metodo = info.compress_type
            bruto = None
            if metodo == zipfile.ZIP_STORED:
                bruto = dados
            entradas.append({
                "nome": info.filename,
                "dados": dados,
                "metodo": metodo,
                "data": info.date_time,
                "bruto": bruto,
            })
    return entradas


def escrever_zip_alinhado(entradas_extra, caminho_saida):
    """Escreve um zip com as entradas fornecidas + alinhamento de 4 bytes
    nas entradas não-comprimidas (estilo zipalign), via extra field local.

    entradas_extra: entradas v1 (META-INF) acrescentadas ao final.
    """
    partes = []
    offset = 0
    cd = []

    def uint16(v):
        return struct.pack("<H", v)

    def uint32(v):
        return struct.pack("<I", v)

    todas = entradas_extra

    for e in todas:
        nome_b = e["nome"].encode("utf-8")
        metodo = e["metodo"]
        if metodo == zipfile.ZIP_DEFLATED:
            import zlib
            co = zlib.compressobj(9, zlib.DEFLATED, -15)
            bruto = co.compress(e["dados"]) + co.flush()
        else:
            bruto = e["dados"]

        # data/time em formato DOS
        dt = e.get("data") or (2026, 1, 1, 0, 0, 0)
        dos_time = (dt[3] << 11) | (dt[4] << 5) | (dt[5] // 2)
        dos_data = ((dt[0] - 1980) << 9) | (dt[1] << 5) | dt[2]

        crc = zlib.crc32(e["dados"]) & 0xFFFFFFFF

        # alinhamento: se a entrada é STORED, o offset do dado deve ser % 4 == 0
        hdr_tam = 30 + len(nome_b)
        extra = b""
        if metodo == zipfile.ZIP_STORED:
            pad = (4 - ((offset + hdr_tam) % 4)) % 4
            if pad:
                # extra field id 0x0000 (sem significado) com pad bytes
                extra = uint16(0x0000) + uint16(pad) + b"\x00" * pad

        lfh = (
            uint32(0x04034b50) + uint16(20) + uint16(0) + uint16(metodo) +
            uint16(dos_time) + uint16(dos_data) + uint32(crc) +
            uint32(len(bruto)) + uint32(len(e["dados"])) +
            uint16(len(nome_b)) + uint16(len(extra)) + nome_b + extra
        )
        desloc = offset
        partes.append(lfh + bruto)
        offset += len(lfh) + len(bruto)

        cd.append({
            "nome_b": nome_b, "metodo": metodo, "crc": crc,
            "comp": len(bruto), "desc": len(e["dados"]),
            "desloc": desloc, "dos_time": dos_time, "dos_data": dos_data,
        })

    inicio_cd = offset
    corpo_cd = b""
    for c in cd:
        corpo_cd += (
            uint32(0x02014b50) + uint16(20) + uint16(20) + uint16(0) +
            uint16(c["metodo"]) + uint16(c["dos_time"]) + uint16(c["dos_data"]) +
            uint32(c["crc"]) + uint32(c["comp"]) + uint32(c["desc"]) +
            uint16(len(c["nome_b"])) + uint16(0) + uint16(0) + uint16(0) +
            uint16(0) + uint32(0) + uint32(c["desloc"]) + c["nome_b"]
        )
    partes.append(corpo_cd)
    fim_cd = inicio_cd + len(corpo_cd)

    eocd = (
        uint32(0x06054b50) + uint16(0) + uint16(0) +
        uint16(len(cd)) + uint16(len(cd)) +
        uint32(len(corpo_cd)) + uint32(inicio_cd) + uint16(0)
    )
    partes.append(eocd)

    with open(caminho_saida, "wb") as f:
        for p in partes:
            f.write(p)
    return inicio_cd, fim_cd, eocd  # posições no arquivo FINAL


# -----------------------------------------------------------------------------
# v1 — assinatura JAR
# -----------------------------------------------------------------------------

def _linhas_72(b):
    """Quebra bytes base64 em linhas de 72 chars (padrão JAR)."""
    import textwrap
    return "\r\n ".join(textwrap.wrap(b.decode("ascii"), 72))


def gerar_v1(entradas, chave, cert):
    """Gera MANIFEST.MF, CERT.SF e CERT.RSA (bytes) para as entradas."""
    mf = ["Manifest-Version: 1.0", "Created-By: 1.0 (Vida Brasil Signer)", ""]
    secoes = []
    for e in entradas:
        if e["nome"].startswith("META-INF/"):
            continue
        d = base64.b64encode(hashlib.sha256(e["dados"]).digest())
        secoes.append("Name: " + e["nome"] + "\r\nSHA-256-Digest: " + d.decode())
    mf_txt = "\r\n".join(mf) + "\r\n" + "\r\n".join(s + "\r\n" for s in secoes) + "\r\n"
    mf_b = mf_txt.encode("ascii")

    # digest dos atributos principais e do manifest inteiro
    principal = mf_b.split(b"\r\n\r\n", 1)[0] + b"\r\n\r\n"
    dig_principal = base64.b64encode(
        hashlib.sha256(principal).digest()).decode()
    dig_manifest = base64.b64encode(hashlib.sha256(mf_b).digest()).decode()

    sf = (
        "Signature-Version: 1.0\r\n"
        "Created-By: 1.0 (Vida Brasil Signer)\r\n"
        "SHA-256-Digest-Manifest-Main-Attributes: " + dig_principal + "\r\n"
        "SHA-256-Digest-Manifest: " + dig_manifest + "\r\n"
        "\r\n"
    ).encode("ascii")
    sf_b = sf

    assinatura = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(sf_b)
        .add_signer(cert, chave, hashes.SHA256())
        .sign(serialization.Encoding.DER,
              [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary])
    )
    return mf_b, sf_b, assinatura


# -----------------------------------------------------------------------------
# v2 — APK Signature Scheme v2
# -----------------------------------------------------------------------------

V2_ID = 0x7109871A
MAGIC_BLOCO = b"APK Sig Block 42"  # mágica obrigatória ao fim do bloco
ALGO_RSA_PKCS1_SHA256 = 0x0103


def _len32(b):
    return struct.pack("<I", len(b)) + b


def digests_v2(conteudo, cd, eocd, desloc_bloco):
    """Digests canônicos (idênticos ao apksig/Google):

    • cada seção (conteúdo, CD, EOCD com o campo CD-offset substituído pelo
      offset do bloco) é fatiada em chunks de 1 MiB;
    • digest do chunk = SHA-256(b"\\xa5" + uint32LE(tam) + chunk);
    • digest final = SHA-256(b"\\x5a" + uint32LE(qtd) + concat(digests)).
    """
    eocd_aj = eocd[:16] + struct.pack("<I", desloc_bloco) + eocd[20:]
    pedacos = []
    for secao in (conteudo, cd, eocd_aj):
        for i in range(0, len(secao), 1048576):
            pedacos.append(secao[i:i + 1048576])
    digests = [
        hashlib.sha256(b"\xa5" + struct.pack("<I", len(c)) + c).digest()
        for c in pedacos
    ]
    return hashlib.sha256(
        b"\x5a" + struct.pack("<I", len(digests)) + b"".join(digests)
    ).digest()


def bloco_v2(digests, chave, cert):
    dig = _len32(struct.pack("<I", ALGO_RSA_PKCS1_SHA256) + _len32(digests))
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    certs = _len32(_len32(cert_der))
    dados_assinados = _len32(_len32(dig) + certs + _len32(b""))

    spki = chave.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    # a assinatura cobre o signed-data SEM o prefixo de comprimento
    sig = chave.sign(dados_assinados[4:], padding.PKCS1v15(), hashes.SHA256())
    # cada assinatura da sequência também é precedida por uint32 de comprimento
    sigs = _len32(_len32(struct.pack("<I", ALGO_RSA_PKCS1_SHA256) + _len32(sig)))

    signer = _len32(dados_assinados + sigs + _len32(spki))
    signers = _len32(signer)
    # par ID-valor: uint64 tamanho do par + uint32 ID + valor
    par = struct.pack("<Q", 4 + len(signers)) + struct.pack("<I", V2_ID) + signers
    # tamanho = pares + campo de tamanho final + mágica de 16 bytes
    tamanho = struct.pack("<Q", len(par) + 8 + len(MAGIC_BLOCO))
    return tamanho + par + tamanho + MAGIC_BLOCO


def aplicar_v2(caminho_entrada, caminho_saida, chave, cert):
    """Insere o bloco de assinatura v2 num zip já com v1."""
    with open(caminho_entrada, "rb") as f:
        dados = f.read()

    # localiza EOCD (sem comentário no nosso zip)
    pos_eocd = dados.rfind(b"PK\x05\x06")
    assert pos_eocd != -1, "EOCD não encontrado"
    eocd = dados[pos_eocd:pos_eocd + 22]
    tam_cd, off_cd = struct.unpack("<II", eocd[12:20])

    conteudo = dados[:off_cd]
    cd = dados[off_cd:off_cd + tam_cd]

    tamanho_bloco = 24 + 12  # 2 tamanhos uint64 + cabeçalho do par
    desloc_bloco = off_cd

    dig = digests_v2(conteudo, cd, eocd, desloc_bloco)
    bloco = bloco_v2(dig, chave, cert)

    # EOCD final aponta para o CD real (depois do bloco); no digest, o campo
    # é substituído pelo offset do bloco (feito dentro de digests_v2)
    final = conteudo + bloco + cd + eocd[:16] + struct.pack("<I", off_cd + len(bloco)) + eocd[20:]
    with open(caminho_saida, "wb") as f:
        f.write(final)
    return len(bloco)


# -----------------------------------------------------------------------------
# verificação embutida
# -----------------------------------------------------------------------------

def verificar(caminho, chave, cert):
    """Reconfere digests v2 e estrutura do bloco no arquivo final."""
    with open(caminho, "rb") as f:
        dados = f.read()
    pos_eocd = dados.rfind(b"PK\x05\x06")
    eocd = dados[pos_eocd:pos_eocd + 22]
    tam_cd, off_cd_final = struct.unpack("<II", eocd[12:20])

    # layout final: … [size8][pares (P)][size8][mágica 16B][CD][EOCD]
    assert dados[off_cd_final - 16:off_cd_final] == MAGIC_BLOCO, "mágica do bloco ausente"
    tamanho_bloco = struct.unpack("<Q", dados[off_cd_final - 24:off_cd_final - 16])[0]
    inicio_bloco = off_cd_final - tamanho_bloco - 8
    assert struct.unpack("<Q", dados[inicio_bloco:inicio_bloco + 8])[0] == tamanho_bloco, "tamanhos divergem"

    P = tamanho_bloco - 8 - 16  # bytes dos pares
    pares = dados[inicio_bloco + 8:inicio_bloco + 8 + P]
    cd_inicio = off_cd_final
    conteudo = dados[:inicio_bloco]
    cd = dados[cd_inicio:cd_inicio + tam_cd]
    eocd_aj = eocd[:16] + struct.pack("<I", inicio_bloco) + eocd[20:]
    dig = digests_v2(conteudo, cd, eocd_aj, inicio_bloco)

    # primeiro par: [uint64 len do par][uint32 ID][signers…]
    pares_tam = struct.unpack("<Q", pares[:8])[0]
    id_lido2 = struct.unpack("<I", pares[8:12])[0]
    assert id_lido2 == V2_ID, "ID do primeiro par inválido"
    valor = pares[12:8 + pares_tam]
    tam_signers = struct.unpack("<I", valor[:4])[0]
    signers = valor[4:4 + tam_signers]
    tam_signer = struct.unpack("<I", signers[:4])[0]
    signer = signers[4:4 + tam_signer]
    tam_dados = struct.unpack("<I", signer[:4])[0]
    dados_ass = signer[4:4 + tam_dados]
    # dentro de dados_assinados: digests
    tam_digs = struct.unpack("<I", dados_ass[:4])[0]
    digs = dados_ass[4:4 + tam_digs]
    tam_entrada = struct.unpack("<I", digs[:4])[0]
    entrada = digs[4:4 + tam_entrada]
    algo, tam_d = struct.unpack("<II", entrada[:8])
    digest_no_bloco = entrada[8:8 + tam_d]
    assert algo == ALGO_RSA_PKCS1_SHA256
    assert digest_no_bloco == dig, "digest v2 recalculado difere!"
    # confere a assinatura RSA
    tam_sigs = struct.unpack("<I", signer[4 + tam_dados:8 + tam_dados])[0]
    secao_sigs = signer[8 + tam_dados:8 + tam_dados + tam_sigs]
    tam_entrada_sig = struct.unpack("<I", secao_sigs[:4])[0]
    entrada_sig = secao_sigs[4:4 + tam_entrada_sig]
    _, tam_s = struct.unpack("<II", entrada_sig[:8])
    sig = entrada_sig[8:8 + tam_s]
    chave.public_key().verify(sig, dados_ass, padding.PKCS1v15(), hashes.SHA256())
    return True


# -----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("saida")
    ap.add_argument("--key", default="tools/vida-brasil-debug-key.pem")
    ap.add_argument("--cert", default="tools/vida-brasil-debug-cert.pem")
    args = ap.parse_args()

    chave, cert = garantir_chave_e_cert(args.key, args.cert)

    print("📦 Lendo APK não-assinado…")
    entradas = ler_entradas_zip(args.entrada)
    entradas = [e for e in entradas if not e["nome"].startswith("META-INF/")]

    print("🧾 Gerando assinatura v1 (JAR)…")
    mf, sf, rsa7 = gerar_v1(entradas, chave, cert)
    extras = entradas + [
        {"nome": "META-INF/MANIFEST.MF", "dados": mf, "metodo": zipfile.ZIP_STORED,
         "data": (2026, 1, 1, 0, 0, 0), "bruto": mf},
        {"nome": "META-INF/CERT.SF", "dados": sf, "metodo": zipfile.ZIP_STORED,
         "data": (2026, 1, 1, 0, 0, 0), "bruto": sf},
        {"nome": "META-INF/CERT.RSA", "dados": rsa7, "metodo": zipfile.ZIP_STORED,
         "data": (2026, 1, 1, 0, 0, 0), "bruto": rsa7},
    ]

    tmp = args.saida + ".tmp"
    print("📐 Reescrevendo zip alinhado (zipalign)…")
    escrever_zip_alinhado(extras, tmp)

    print("🔏 Inserindo bloco v2 (RSASSA-PKCS1-SHA256)…")
    aplicar_v2(tmp, args.saida, chave, cert)
    os.remove(tmp)

    print("✅ Verificando…")
    verificar(args.saida, chave, cert)

    # sanity: zip abre e tem as entradas esperadas
    with zipfile.ZipFile(args.saida) as z:
        nomes = z.namelist()
        assert "AndroidManifest.xml" in nomes
        assert "classes.dex" in nomes
        assert "META-INF/CERT.RSA" in nomes
        assert "assets/index.html" in nomes
        bad = z.testzip()
        assert bad is None, f"entrada corrompida: {bad}"

    print(f"🎉 APK assinado: {args.saida} ({os.path.getsize(args.saida)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
