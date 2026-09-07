from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

SOURCE = Path('/home/ubuntu/upload')
OUTPUT = Path('/tmp/amala-photo-sheets')
FILES = [
    'IMG_9461.jpeg', 'IMG_9565.jpeg', 'IMG_9620.jpeg', 'IMG_9430.jpeg', 'IMG_9467.jpeg',
    'IMG_9446.jpeg', 'IMG_9411.jpeg', 'IMG_9427.jpeg', 'IMG_9466.jpeg', 'IMG_9574.jpeg',
    'IMG_9408.jpeg', 'IMG_9465.jpeg', 'IMG_9445.jpeg', 'IMG_9428.jpeg', 'IMG_9469.jpeg',
    'IMG_9468.jpeg', 'IMG_9464.jpeg', 'IMG_9425.jpeg', 'IMG_9443.jpeg', 'IMG_9438.jpeg',
    'IMG_9418.jpeg', 'IMG_9422.jpeg', 'IMG_9462.jpeg', 'IMG_9423.jpeg', 'IMG_9458.jpeg',
    'IMG_9622.jpeg', 'IMG_9454.jpeg', 'IMG_9415.jpeg',
]

CELL_WIDTH, CELL_HEIGHT, LABEL_HEIGHT, COLUMNS = 360, 280, 34, 3
ROWS_PER_SHEET = 4

OUTPUT.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default()
for index in range(0, len(FILES), COLUMNS * ROWS_PER_SHEET):
    batch = FILES[index:index + COLUMNS * ROWS_PER_SHEET]
    rows = (len(batch) + COLUMNS - 1) // COLUMNS
    sheet = Image.new('RGB', (COLUMNS * CELL_WIDTH, rows * (CELL_HEIGHT + LABEL_HEIGHT)), 'white')
    draw = ImageDraw.Draw(sheet)
    for offset, filename in enumerate(batch):
        image = ImageOps.exif_transpose(Image.open(SOURCE / filename).convert('RGB'))
        image.thumbnail((CELL_WIDTH, CELL_HEIGHT), Image.Resampling.LANCZOS)
        x = (offset % COLUMNS) * CELL_WIDTH + (CELL_WIDTH - image.width) // 2
        y = (offset // COLUMNS) * (CELL_HEIGHT + LABEL_HEIGHT) + (CELL_HEIGHT - image.height) // 2
        sheet.paste(image, (x, y))
        label_y = (offset // COLUMNS) * (CELL_HEIGHT + LABEL_HEIGHT) + CELL_HEIGHT + 9
        draw.text(((offset % COLUMNS) * CELL_WIDTH + 8, label_y), filename, fill='black', font=font)
    sheet.save(OUTPUT / f'menu-photo-sheet-{index // (COLUMNS * ROWS_PER_SHEET) + 1}.jpg', quality=90)
