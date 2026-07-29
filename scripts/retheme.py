import os

replacements = [
    ('#C0392B', '#D02010'),
    ('#1A0F0A', '#201060'),
    ('#8B6F5E', '#6B6490'),
    ('#FDF8F3', '#FFFFFF'),
    ('#FFF5EC', '#F4F3FB'),
    ('#E8D5C4', '#E8E6F4'),
    ('#A08070', '#8B88B0'),
    ('#6B3A2A', '#1A1640'),
    ('#B09080', '#9B94C4'),
    ('#EDE0D4', '#EDEAFB'),
    ('#F0E4D8', '#F0EEF9'),
    ('#8B1A10', '#150B50'),
    ('#D4A017', '#F0C000'),
    ('#1E1060', '#201060'),
]

app_dir = os.path.join(os.path.dirname(__file__), '..', 'app')
count = 0
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as fh:
                content = fh.read()
            new_content = content
            for old, new in replacements:
                new_content = new_content.replace(old, new)
                new_content = new_content.replace(old.lower(), new.lower())
            if new_content != content:
                with open(path, 'w') as fh:
                    fh.write(new_content)
                count += 1
                print(f"  updated: {path}")

print(f"\nDone — updated {count} files")
