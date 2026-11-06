#!/usr/bin/env python3
"""Deterministic fictional statements for the actual local PDF.js parser.

These simplified column layouts are test fixtures, not bank certifications.
No user data, credentials, network access or external fonts are used.
"""
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'tests' / 'fixtures' / 'statements'
DEST.mkdir(parents=True, exist_ok=True)


def statement(name, country, currency, pages):
    canvas = Canvas(str(DEST / name), pagesize=(595, 842),
                    pageCompression=1, invariant=1)
    canvas.setTitle('TRACE - RELEVE ENTIEREMENT FICTIF - ' + country)
    for page, rows in enumerate(pages, 1):
        canvas.setFont('Helvetica-Bold', 14)
        canvas.drawString(38, 800, 'TRACE - RELEVE FICTIF ' + country)
        canvas.setFont('Helvetica', 10)
        canvas.drawString(38, 779, 'Octobre 2026 - ' + currency + ' - Aucun compte bancaire reel')
        canvas.setFont('Helvetica-Bold', 10)
        for x, text in [(38, 'Date'), (130, 'Libellé'), (435, 'Débit'), (515, 'Crédit')]:
            canvas.drawString(x, 742, text)
        canvas.line(38, 733, 560, 733)
        canvas.setFont('Helvetica', 10)
        for index, (date, label, debit, credit) in enumerate(rows):
            y = 710 - index * 26
            for x, text in [(38, date), (130, label), (435, debit), (515, credit)]:
                if text:
                    canvas.drawString(x, y, text)
        canvas.drawString(38, 80, 'Solde et couverture du relevé : contrôle manuel requis')
        canvas.drawString(38, 60, f'Page {page} / {len(pages)} - Donnees fictives uniquement')
        canvas.showPage()
    canvas.save()


statement('fr-eur-multipage.pdf', 'FRANCE', 'EUR', [
    [('08/10/2026', 'Boulangerie - exemple', '40,00', ''),
     ('09/10/2026', 'Paiement USD - exemple', '46,20', '')],
    [('11/10/2026', 'Virement CAD vers EUR', '', '95,00'),
     ('13/10/2026', 'SEPA à vérifier', '23,40', '')],
])
statement('ca-cad-multipage.pdf', 'CANADA', 'CAD', [
    [('2026-10-04', 'Salaire - fictif', '', '1,800.00'),
     ('2026-10-11', 'Virement CAD vers EUR', '150.00', '')],
    [('2026-10-12', 'Paiement Mastercard', '50.00', ''),
     ('2026-10-20', 'Operation absente de TRACE', '27.89', '')],
])
statement('ambiguous-columns.pdf', 'FRANCE', 'EUR', [
    [('08/10/2026', 'Deux montants - ne pas deviner', '40,00', '10,00'),
     ('09/10/2026', 'Montant illisible', 'ILLISIBLE', ''),
     ('31/02/2026', 'Date impossible', '50,00', '')],
])
canvas = Canvas(str(DEST / 'image-only.pdf'), pagesize=(595, 842), invariant=1)
# A rasterized fictional statement: there is genuinely no PDF text layer.
image = Image.new('RGB', (1040, 1520), 'white')
draw = ImageDraw.Draw(image)
draw.text((40, 40), 'TRACE - SCAN FICTIF - AUCUN COMPTE REEL', fill='black')
draw.text((40, 100), '08/10/2026   Achat fictif   40,00 EUR', fill='black')
canvas.drawImage(ImageReader(image), 38, 38, width=520, height=760)
canvas.showPage()
canvas.save()
print('Created four entirely fictional compressed PDF fixtures in', DEST)
