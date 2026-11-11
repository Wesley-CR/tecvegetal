import sys, tempfile, time, re
from playwright.sync_api import sync_playwright
ext = sys.argv[1]
NOTFOUND = '<meta name="viewport" content="width=device-width"><head><style>body{font-family:Roboto}</style></head><body><div class="not-found-page-main-container"><h1>404</h1><script>console.log("pagina 404 del TEC")</script></div></body>'
HOME = '<html><body><ul class="mktree"><li>Cursos<ul id="tree-dotlrn_class_instance"><li>SEMESTRE 2 2026<ul><li><a href="/dotlrn/classes/CA/IC6831/S-2-2026.SJ.IC6831.40/">Aseguramiento de la calidad del software GR 40</a></li></ul></li></ul></li></ul></body></html>'
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=False, color_scheme='dark', viewport={'width':1400,'height':900},
        args=['--headless=new', f'--disable-extensions-except={ext}', f'--load-extension={ext}'])
    counts = {}
    def handle(route):
        u = route.request.url
        k = re.sub(r'S-2-2026[^/]*/', '', u.split('?')[0]); counts[k] = counts.get(k, 0) + 1
        if '/dotlrn/index' in u: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HOME)
        elif '/evaluation/' in u: route.fulfill(status=200, content_type='text/html; charset=utf-8', body='<html><body><div id="content_assigns"><div id="h_1" class="asign_student title_acor_grade"><span class="clase" title="Investigacion (15%)">Investigacion </span><div class="title_right sub_total" item_weight="15">7.5</div></div><div class="container_accor_detail"><div class="container_accor" assign_id="a1"><div class="head_subaccord"><div><span class="assignNameText">Avance 2</span></div></div><div class="content_delivery"><div class="col-md-6"><div class="content_description row"><div class="col-md-12"><p class="title_subsection">Fecha de Entrega :</p><div class="body_style">30/10/2026 23:45</div></div></div></div><div class="col-md-6"><button class="btn_send_answer" due_date="2026-10-30 23:45:00 GMT"></button><div class="container_dropzone" late_submit="f"></div><div class="content_description row"><p class="title_subsection">Entrega:</p><div id="data_file_a1" class="body_style">No hay entregas de archivo o enlace</div></div><div class="content_description row"><p class="title_subsection">Nota obtenida:</p><div class="body_style">-- / 100</div></div></div></div></div></div></div></body></html>')
        elif u.startswith('https://tecdigital.tec.ac.cr/'): route.fulfill(status=404, content_type='text/html; charset=utf-8', body=NOTFOUND)
        else: route.abort()
    ctx.route('**/*', handle)
    time.sleep(1.5)
    print('service workers / extensions:', [sw.url for sw in ctx.service_workers], [bp.url for bp in ctx.background_pages])
    page = ctx.new_page()
    logs = []
    page.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    page.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    page.goto(sys.argv[2] if len(sys.argv) > 2 else 'https://tecdigital.tec.ac.cr/tecvegetal/', wait_until='commit')
    page.wait_for_timeout(10000)
    print('PINTA:', page.evaluate('''new Promise(r=>{requestAnimationFrame(()=>r('si, hay frames')); setTimeout(()=>r('NO: nunca pinta'),3000)})'''))
    print('url:', page.url)
    print('title:', page.title())
    print('body:', page.evaluate('document.body ? document.body.innerText.slice(0,2000) : "(sin body)"').replace('\n',' | '))
    print('logs:', '\n'.join(logs[:20]) or 'ninguno')
    print('requests en 10s:', sum(counts.values())); [print('  ', v, k) for k, v in sorted(counts.items(), key=lambda x: -x[1])[:6]]
    if len(sys.argv)>3:
        try: page.screenshot(path=sys.argv[3], timeout=8000)
        except Exception as e: print('screenshot fallo:', str(e)[:80])
    ctx.close()
