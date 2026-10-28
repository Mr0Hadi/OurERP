/**
 * dev-inspector — از هر چیزِ روی صفحه به کدش، فقط در `vite dev`.
 *
 * سه بخش:
 *  1. وصله‌ی runtimeِ dev روی React ۱۹ تا منبعِ هر JSX (`فایل:خط`) روی fiber بماند. این بخش از
 *     `vite-plugin-react-click-to-component` (نگه‌دارنده: تیمِ Vite) گرفته می‌شود چون به داخلِ
 *     React وابسته است و با نسخه‌های React باید همراه شود؛ منوی خودش استفاده نمی‌شود.
 *  2. `client.js` — هایلایت با Alt، پنلِ لایه‌ها، کپی برای Claude Code. با `transformIndexHtml`
 *     تزریق می‌شود؛ کدِ برنامه هیچ importی از آن ندارد.
 *  3. `GET /__inspector/info?file=&name=` — خطِ تعریف، مصرف‌کننده‌ها و سندهای یک فایل، و `GET /__inspector/locate`
 *     — خطِ دقیقِ تگ‌ها (Compiler خط‌ها را جابه‌جا می‌کند)، و `GET /__inspector/text` — متنِ المان
 *     در کدام خطِ کد نوشته شده (داده‌هایی مثلِ `navigationData.js`)؛ همه در `sourceIndex.js`.
 *     باز کردن در ویرایشگر با `/__open-in-editor`ِ خودِ Vite است.
 *
 * در build هیچ‌کدام اجرا نمی‌شوند (`apply: "serve"`).
 * راهنما: docs/architecture/01-tech-stack-and-tooling.md
 */
import { readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { reactClickToComponent } from "vite-plugin-react-click-to-component";
import { createSourceIndex } from "./sourceIndex.js";

const CLIENT_ID = "virtual:dev-inspector-client";
const CLIENT_FILE = join(import.meta.dirname, "client.js");
const RESOLVED_CLIENT_ID = `\0${CLIENT_ID}`;

export function devInspector({ ignoreLayers = ["/src/shared/components/ui/"] } = {}) {
  const upstream = reactClickToComponent();
  let root = "";
  let base = "/";
  let index = null;

  return {
    name: "dev-inspector",
    apply: "serve",

    configResolved(config) {
      root = config.root;
      base = config.base;
      upstream.configResolved(config);
    },

    // فقط وصله‌ی `jsx-dev-runtime`ِ upstream؛ کلاینتِ upstream تزریق نمی‌شود.
    transform: upstream.transform,

    configureServer(server) {
      index = createSourceIndex({ root });
      const invalidate = (file) => index.invalidate(file);
      server.watcher.on("change", invalidate);
      server.watcher.on("add", invalidate);
      server.watcher.on("unlink", invalidate);

      // ماژولِ مجازی وابستگی‌اش به client.js را نمی‌شناسد (`addWatchFile` برای آن در Vite ۸ کار نکرد):
      // با ویرایشِ client.js کشِ ماژول باطل و صفحه دوباره بار می‌شود.
      server.watcher.add(CLIENT_FILE);
      server.watcher.on("change", (file) => {
        if (file !== CLIENT_FILE) return;
        const graph = server.environments?.client?.moduleGraph ?? server.moduleGraph;
        const module = graph.getModuleById(RESOLVED_CLIENT_ID);
        if (module) graph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      });

      // خطِ دقیقِ چند لایه با هم (`sourceIndex.locate`): `q` = JSONِ `[{ file, line, name }]`.
      server.middlewares.use("/__inspector/locate", (req, res) => {
        let layers = [];
        try {
          layers = JSON.parse(new URL(req.url, "http://localhost").searchParams.get("q") ?? "[]");
        } catch {
          // ورودیِ خراب = هیچ لایه.
        }
        const lines = layers.map(({ file, line, name }) => {
          const absolute = resolve(root, String(file));
          return absolute.startsWith(root + sep) ? index.locate(absolute, Number(line) || 1, String(name)) : line;
        });
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(lines));
      });

      // متنِ المان در کدام خط‌های `src/` آمده (`sourceIndex.findText`): `q` = JSONِ آرایه‌ی چند متن.
      server.middlewares.use("/__inspector/text", (req, res) => {
        // `near` = JSONِ فایل‌های زنجیره‌ی کامپوننت، برای رتبه‌بندی.
        let texts = [];
        let near = [];
        try {
          const params = new URL(req.url, "http://localhost").searchParams;
          texts = JSON.parse(params.get("q") ?? "[]");
          near = JSON.parse(params.get("near") ?? "[]")
            .map((file) => resolve(root, String(file)))
            .filter((file) => file.startsWith(root + sep));
        } catch {
          // ورودیِ خراب = هیچ متن.
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(texts.slice(0, 5).map((text) => ({ text: String(text), hits: index.findText(text, { near }) }))));
      });

      server.middlewares.use("/__inspector/info", (req, res) => {
        const params = new URL(req.url, "http://localhost").searchParams;
        const file = params.get("file") ?? "";
        const absolute = resolve(root, file);
        // فقط فایل‌های همین پروژه؛ سرورِ dev روی localhost است ولی مسیرِ دلخواه خوانده نمی‌شود.
        if (!absolute.startsWith(root + sep)) {
          res.statusCode = 403;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(index.info(absolute, params.get("name") ?? undefined)));
      });
    },

    // با `src`، نه اسکریپتِ inline: inline به ماژولِ `index.html?html-proxy` تبدیل می‌شود که بعد از
    // راه‌اندازیِ دوباره‌ی سرور تا ساخته شدنِ دوباره‌ی HTML وجود ندارد (۵۰۰) و inspector بی‌صدا
    // بار نمی‌شد. `/@id/__x00__` همان نشانیِ ثابتِ Vite برای ماژولِ مجازی است.
    transformIndexHtml: {
      order: "pre",
      handler: () => [
        { tag: "script", attrs: { type: "module", src: `${base}@id/__x00__${CLIENT_ID}` }, injectTo: "head" },
      ],
    },

    resolveId: {
      filter: { id: new RegExp(`^${CLIENT_ID}$`) },
      handler: () => RESOLVED_CLIENT_ID,
    },

    load: {
      filter: { id: new RegExp(`^\\0${CLIENT_ID}$`) },
      handler() {
        const config = { root, base, ignoreLayers };
        return `const __INSPECTOR_CONFIG__ = ${JSON.stringify(config)};\n` + readFileSync(CLIENT_FILE, "utf8");
      },
    },
  };
}
