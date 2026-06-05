import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Icon, type IconName } from '@/components/ui/Icon';

export const metadata = {
  title: 'AI 养护 - 肉友社',
  description: '多肉植物 AI 养护助手，支持病害诊断、拍照识别、浇水和配土建议。',
};

const quickQuestions = [
  '多肉叶片发软怎么办?',
  '夏天如何给多肉浇水?',
  '叶片化水要怎么处理?',
  '新手适合养哪些多肉?',
];

const careTools: Array<{ title: string; desc: string; icon: IconName; href: string }> = [
  { title: '拍照识别', desc: '根据图片查找品种和状态', icon: 'camera', href: '/search?q=多肉拍照识别' },
  { title: '病害诊断', desc: '黑腐、化水、虫害快速排查', icon: 'alert', href: '/search?q=多肉病害诊断' },
  { title: '浇水建议', desc: '按季节、盆土和环境判断', icon: 'plants', href: '/search?q=多肉浇水建议' },
  { title: '配土方案', desc: '颗粒比例和控水方案参考', icon: 'settings', href: '/search?q=多肉配土方案' },
];

export default function AiCarePage() {
  return (
    <AppShell showFloatingAi={false}>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="p-6 md:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-leaf-800">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf-600" />
                AI 养护助手
              </span>
              <h1 className="mt-5 text-3xl font-bold leading-tight text-ink-950 md:text-4xl">
                把多肉问题集中放到这里处理
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-600 md:text-base">
                叶片发软、黑腐化水、徒长、浇水和配土问题都可以先从这里开始。选择一个常见问题，或输入你的养护场景继续查找。
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {careTools.map((tool) => (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="group flex items-start gap-3 rounded-xl border border-leaf-100 bg-leaf-50/35 p-4 transition hover:-translate-y-0.5 hover:bg-leaf-50 hover:shadow-sm"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-leaf-700 ring-1 ring-leaf-100">
                      <Icon name={tool.icon} size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink-900 group-hover:text-leaf-800">{tool.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-ink-500">{tool.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-leaf-100 bg-sand-50/60 p-5 lg:border-l lg:border-t-0">
              <AiAssistantPanel />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-leaf-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-ink-950">常见养护问题</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {quickQuestions.map((question) => (
                <Link
                  key={question}
                  href={`/search?q=${encodeURIComponent(question)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-leaf-100 px-4 py-3 text-sm font-semibold text-ink-700 transition hover:bg-leaf-50 hover:text-leaf-800"
                >
                  <span>{question}</span>
                  <Icon name="arrow-right" size={14} className="text-ink-400" />
                </Link>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-leaf-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-ink-950">提问建议</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-ink-600">
              <p>描述品种、养护环境、浇水频率、光照时长和最近变化，结果会更准确。</p>
              <p>如果是病害问题，优先补充根部、叶片、盆土湿度和发病时间。</p>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function AiAssistantPanel() {
  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-5 shadow-[0_18px_48px_rgba(15,20,25,0.08)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-950">AI 助手</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-1 text-[11px] font-semibold text-leaf-800">
          <span className="h-1.5 w-1.5 rounded-full bg-leaf-600" />
          在线
        </span>
      </div>
      <div className="space-y-4">
        <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-md bg-leaf-100 px-4 py-3 text-sm text-ink-800">
          我的多肉叶片发软是什么原因?
          <div className="mt-1 text-right text-[10px] text-ink-500">10:24</div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
            <Icon name="plants" size={17} />
          </span>
          <div className="rounded-2xl rounded-tl-md bg-sand-50 px-4 py-3 text-sm leading-6 text-ink-700">
            叶片发软通常和控水、根系、光照有关。先检查盆土是否长期湿润，再看根部有没有腐烂；如果最近暴晒，也可能是应激脱水。
            <div className="mt-2 text-[10px] text-ink-500">10:24</div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {['浇水过多怎么办', '根系检查教程', '叶片发软建议'].map((item) => (
          <Link
            key={item}
            href={`/search?q=${encodeURIComponent(item)}`}
            className="rounded-xl bg-leaf-50 px-3 py-2 text-xs font-semibold text-leaf-800 hover:bg-leaf-100"
          >
            {item}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex h-12 items-center gap-2 rounded-xl border border-leaf-100 bg-white px-3 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-sm text-ink-400">继续问我植物养护问题...</span>
        <Link href="/search?q=多肉图片诊断" aria-label="上传图片" className="text-ink-500 hover:text-leaf-700">
          <Icon name="image" size={17} />
        </Link>
        <Link href="/search?q=多肉拍照诊断" aria-label="拍照" className="text-ink-500 hover:text-leaf-700">
          <Icon name="camera" size={17} />
        </Link>
        <Link href="/search?q=多肉养护问题" aria-label="发送" className="grid h-8 w-8 place-items-center rounded-full bg-leaf-600 text-white hover:bg-leaf-700">
          <Icon name="send" size={15} />
        </Link>
      </div>
    </section>
  );
}
