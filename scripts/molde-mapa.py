# Gera o molde do mapa para o ilustrador (4096 x 4096), igual ao jogo atual.
# Uso: python3 scripts/molde-mapa.py docs/ilustrador/mapa/molde-mapa-4096-v2.png
# Medidas: o pergaminho tem 64 quadrados de área de jogo + 12 de borda de cada lado (88 no total),
# como em src/parchment-map.js (mapMargin) e src/map.js (MAP).
import sys
from PIL import Image, ImageDraw, ImageFont

N = 4096
W = 64; M = 12; T = W + 2 * M
S = N / T                     # 46,545 px por quadrado
P0 = M * S; P1 = (M + W) * S  # área de jogo: 558,5 a 3537,5 px
WAY = [(57, 0), (57, 11), (33, 11), (33, 43), (57, 43), (57, 27), (17, 27), (17, 62)]
NAMES = ['E', '1', '2', '3', '4', '5', '6', 'S']
RIP = 140                     # faixa de fora que pode ser rasgada/queimada

FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f = lambda s, b=True: ImageFont.truetype(FB if b else FR, s)

INK = (90, 50, 22); RED = (178, 30, 26); PAPER = (240, 225, 194); BORDER = (229, 206, 160)
img = Image.new('RGB', (N, N), BORDER)
d = ImageDraw.Draw(img)
X = lambda gx: P0 + gx * S

# Faixa que pode rasgar/queimar
d.rectangle([0, 0, N - 1, N - 1], outline=(150, 100, 50), width=6)
for i in range(0, N, 60):  # linha tracejada a RIP px da beira
    for a, b in (((i, RIP), (i + 30, RIP)), ((i, N - RIP), (i + 30, N - RIP)), ((RIP, i), (RIP, i + 30)), ((N - RIP, i), (N - RIP, i + 30))):
        d.line([a, b], fill=(150, 100, 50), width=5)

# Área de jogo
d.rectangle([P0, P0, P1, P1], fill=(251, 245, 232))
for k in range(W + 1):  # quadrados finos
    v = X(k); d.line([(v, P0), (v, P1)], fill=(232, 220, 196), width=2); d.line([(P0, v), (P1, v)], fill=(232, 220, 196), width=2)
for k in range(1, W, 2):  # casas das pedras (2x2, começam nos quadrados ímpares)
    v = X(k); d.line([(v, P0), (v, P1)], fill=(205, 182, 140), width=3); d.line([(P0, v), (P1, v)], fill=(205, 182, 140), width=3)
d.rectangle([P0, P0, P1, P1], outline=INK, width=10)

# Trilha (o jogo desenha sozinho): caminho sem pedras, tracejado
cen = [(X(x + 1), X(y + 1)) for x, y in WAY]
for (ax, ay), (bx, by) in zip(cen, cen[1:]):
    L = max(abs(bx - ax), abs(by - ay)); n = int(L // 50)
    for i in range(n):
        t0, t1 = i / n, (i + .55) / n
        d.line([(ax + (bx - ax) * t0, ay + (by - ay) * t0), (ax + (bx - ax) * t1, ay + (by - ay) * t1)], fill=(214, 90, 80), width=12)

# Plataformas dos pontos (cruz) e centro 2x2
for (x, y), nm in zip(WAY, NAMES):
    for dx in range(-2, 4):
        for dy in range(0, 2):
            for cx, cy in ((x + dx, y + dy), (x + dy, y + dx)):
                if 0 <= cx < W and 0 <= cy < W:
                    d.rectangle([X(cx), X(cy), X(cx + 1), X(cy + 1)], fill=(201, 164, 110))
    d.rectangle([X(x), X(y), X(x + 2), X(y + 2)], fill=RED)
    px, py = round(X(x + 1)), round(X(y + 1))
    lab = f'({px}, {py}) px'
    if x > W / 2:  # pontos da direita: texto à esquerda, para não cair na borda
        lw = d.textlength(lab, font=f(52)); nw = d.textlength(nm, font=f(120))
        d.text((X(x - 2) - 24 - nw, X(y) - 30), nm, font=f(120), fill=RED)
        d.text((X(x - 2) - 24 - lw, X(y + 2) + 6), lab, font=f(52), fill=INK)
    else:
        d.text((X(x + 2) + 24, X(y) - 30), nm, font=f(120), fill=RED)
        d.text((X(x + 2) + 24, X(y + 2) + 6), lab, font=f(52), fill=INK)

def ctext(cx, cy, txt, size, fill=INK, bold=True, spacing=14):
    ft = f(size, bold); bb = d.multiline_textbbox((0, 0), txt, font=ft, align='center', spacing=spacing)
    d.multiline_text((cx - (bb[2] - bb[0]) / 2, cy - (bb[3] - bb[1]) / 2), txt, font=ft, fill=fill, align='center', spacing=spacing)

# Borda: zonas
ctext(N / 2, 230, 'TÍTULO: O COVIL DOS DRAGÕES TD', 96)
ctext(N / 2, 380, 'MOLDE DO MAPA v2 · 4096 x 4096 px · área de jogo de 559 a 3537 px (64 x 64 quadrados de 46,5 px)', 50, bold=False)
ctext(P0 / 2 + RIP / 2, N / 2, 'DRAGÕES\nE\nENFEITES\n\n(borda)', 64)
ctext(N - P0 / 2 - RIP / 2, N / 2, 'DRAGÕES\nE\nENFEITES\n\n(borda)', 64)
ctext(P0 / 2 + RIP / 2, P1 + (N - P1 - RIP) / 2, 'BÚSSOLA\n(qualquer\ncanto)', 46)
notes = ('Trilha vermelha tracejada: o JOGO desenha sozinho e ela muda com o labirinto. NÃO pintar trilha nem estrada.\n'
         'Cruzes dos pontos e os números: o JOGO desenha. Debaixo delas, deixar o fundo liso.\n'
         'Dentro do quadro: fundo claro e calmo, traço fino e fraco, sem texto e sem nada grande.\n'
         'Linha tracejada de fora: pode rasgar ou queimar o papel até ela. Texto e enfeites importantes ficam para dentro.')
ctext(N / 2 + 120, P1 + (N - P1 - RIP) / 2, notes, 46, bold=False, spacing=20)

img.save(sys.argv[1] if len(sys.argv) > 1 else 'molde-mapa-4096-v2.png', optimize=True)
