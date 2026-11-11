"""Prepare fixed application files after the TypeScript generator; never a runtime exporter."""
import json
import pathlib
import zipfile
from lxml import etree

ROOT = pathlib.Path('/tmp/sjb-applications')
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
for source in ROOT.glob('*.pptx'):
    with zipfile.ZipFile(source) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}
    root = etree.fromstring(parts['ppt/presentation.xml'])
    # ECMA-376 order: slide masters, notes masters, handout masters, slides, sizes.
    notes = root.find('{'+P+'}notesMasterIdLst')
    if notes is not None:
        root.remove(notes)
        root.insert(1, notes)
    parts['ppt/presentation.xml'] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
    types = etree.fromstring(parts['[Content_Types].xml'])
    for item in list(types):
        if item.tag.endswith('Override') and item.attrib['PartName'].lstrip('/') not in parts:
            types.remove(item)
    parts['[Content_Types].xml'] = etree.tostring(types, xml_declaration=True, encoding='UTF-8', standalone=True)
    with zipfile.ZipFile(source, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)

for record in json.loads((ROOT/'manifest.json').read_text()):
    if record['format'] != 'Layered SVG':
        continue
    name = record['id']
    with zipfile.ZipFile(ROOT/(name+'.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        for suffix in ['.svg', '-guides.svg', '-handoff.txt']:
            archive.write(ROOT/(name+suffix), name+suffix)
print('Prepared validated-source packaging; run Office validators before upload.')