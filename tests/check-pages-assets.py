from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import re
root=Path(__file__).resolve().parent.parent
issues=[];checked=0
class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=set();self.refs=[];self.labels=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids:issues.append('Duplicate id: '+a['id'])
            self.ids.add(a['id'])
        if tag=='label' and a.get('for'):self.labels.append(a['for'])
        for key in ('href','src'):
            if a.get(key):self.refs.append(a[key])
for path in root.glob('*.html'):
    page=Page();page.feed(path.read_text(encoding='utf8'))
    for label in page.labels:
        if label not in page.ids:issues.append(path.name+': missing label target '+label)
    for ref in page.refs:
        value=urlsplit(ref)
        if value.scheme or value.netloc:continue
        if not value.path:
            if value.fragment and value.fragment not in page.ids:issues.append(path.name+': missing anchor '+ref)
            continue
        if value.path.startswith('/'):issues.append(path.name+': root-relative path incompatible with a project site: '+ref);continue
        target=path.parent/unquote(value.path)
        if target.is_dir():target=target/'index.html'
        checked+=1
        if not target.is_file():issues.append(path.name+': missing asset '+ref)
for path in root.glob('*.css'):
    for ref in re.findall(r'url\([\'\"]?([^\)\'\"]+)',path.read_text(encoding='utf8')):
        if urlsplit(ref).scheme or ref.startswith('#'):continue
        checked+=1
        if not (path.parent/ref).is_file():issues.append(path.name+': missing CSS asset '+ref)
print('Local resource references checked:',checked)
if issues:raise SystemExit('\n'.join(issues))
print('No missing resource references, duplicate IDs, broken labels or root-relative links.')
