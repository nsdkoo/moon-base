# 打包单文件：template.html + three.min.js + app.js -> index.html
import os, io, json, base64

BASE = os.path.dirname(os.path.abspath(__file__))

def rd(name):
    with io.open(os.path.join(BASE, name), 'r', encoding='utf-8') as f:
        return f.read()

tpl   = rd('template.html')
three = rd('three.min.js')
app   = rd('app.js')
assert '/*__SCENE_DESIGN__*/' in app, 'app missing scene design placeholder'
app = app.replace('/*__SCENE_DESIGN__*/', rd('scene-design.js') + '\n' + rd('colony-life.js') + '\n' + rd('ecology.js'), 1)
with open(os.path.join(BASE, 'assets', 'earth-day.jpg'), 'rb') as image:
    earth = 'data:image/jpeg;base64,' + base64.b64encode(image.read()).decode('ascii')
app = 'var MOON_ASSETS = ' + json.dumps({'earth': earth}) + ';\n' + app

assert '/*__THREE__*/' in tpl, 'template missing THREE placeholder'
assert '/*__APP__*/' in tpl, 'template missing APP placeholder'
assert 'assets/' not in app, 'app still references external assets'

out = tpl.replace('/*__THREE__*/', three, 1).replace('/*__APP__*/', app, 1)

dst = os.path.join(BASE, 'index.html')
with io.open(dst, 'w', encoding='utf-8') as f:
    f.write(out)
print('OK index.html', len(out), 'bytes')
