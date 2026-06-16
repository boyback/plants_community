import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const metadata = {
  title: "AI 养护 - 植友圈",
  description: '多肉植物 AI 养护助手，支持病害诊断、拍照识别、浇水和配土建议。'
};

const quickQuestions = [
'多肉叶片发软怎么办?',
'夏天如何给多肉浇水?',
'叶片化水要怎么处理?',
'新手适合养哪些多肉?'];


const careTools: Array<{title: string;desc: string;icon: IconName;href: string;}> = [
{ title: '拍照识别', desc: '根据图片查找品种和状态', icon: 'camera', href: '/search?q=多肉拍照识别' },
{ title: '病害诊断', desc: '黑腐、化水、虫害快速排查', icon: 'alert', href: '/search?q=多肉病害诊断' },
{ title: '浇水建议', desc: '按季节、盆土和环境判断', icon: 'plants', href: '/search?q=多肉浇水建议' },
{ title: '配土方案', desc: '颗粒比例和控水方案参考', icon: 'settings', href: '/search?q=多肉配土方案' }];


export default function AiCarePage() {
  return (
    <AppShell showFloatingAi={false}>
      <div className={styles.r_b43b4c08}>
        <section className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
          <div className={cx(styles.r_f3c543ad, styles.r_63a285be, styles.r_52a2e906)}>
            <div className={cx(styles.r_0478c89a, styles.r_0e69a2e2)}>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_ac204c10, styles.r_f2b23104, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb)}>
                <span className={cx(styles.r_095acb27, styles.r_c696a089, styles.r_ac204c10, styles.r_6bceb016)} />
                AI 养护助手
              </span>
              <h1 className={cx(styles.r_fb77735e, styles.r_751fb0d1, styles.r_69450ef1, styles.r_e9fadafb, styles.r_6d623258, styles.r_c3c84444)}>
                把多肉问题集中放到这里处理
              </h1>
              <p className={cx(styles.r_0ab86672, styles.r_2cc8041e, styles.r_fc7473ca, styles.r_7eff2faf, styles.r_02eb621e, styles.r_cd83ad2f)}>
                叶片发软、黑腐化水、徒长、浇水和配土问题都可以先从这里开始。选择一个常见问题，或输入你的养护场景继续查找。
              </p>
              <div className={cx(styles.r_31f25533, styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816)}>
                {careTools.map((tool) =>
                <Link
                  key={tool.title}
                  href={tool.href}
                  className={cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_9eb357d9, styles.r_8e63407b, styles.r_56bf8ae8, styles.r_0ca49668, styles.r_5756b7b4, styles.r_ab1dd417)}>

                    <span className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_67d66567, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_3daca9af, styles.r_52c47100)}>
                      <Icon name={tool.icon} size={18} />
                    </span>
                    <span className={styles.r_7e0b7cdf}>
                      <span className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618, styles.r_d94501d2)}>{tool.title}</span>
                      <span className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>{tool.desc}</span>
                    </span>
                  </Link>
                )}
              </div>
            </div>

            <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_c2356067, styles.r_c07e54fd, styles.r_bb3e9515, styles.r_7d283214)}>
              <AiAssistantPanel />
            </div>
          </div>
        </section>

        <section className={cx(styles.r_f3c543ad, styles.r_b39e60c3, styles.r_291f1cab)}>
          <div className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
            <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258)}>常见养护问题</h2>
            <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816)}>
              {quickQuestions.map((question) =>
              <Link
                key={question}
                href={`/search?q=${encodeURIComponent(question)}`}
                className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_eb6abb1f, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_81be6435)}>

                  <span>{question}</span>
                  <Icon name="arrow-right" size={14} className={styles.r_66a36c90} />
                </Link>
              )}
            </div>
          </div>

          <aside className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
            <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258)}>提问建议</h2>
            <div className={cx(styles.r_0ab86672, styles.r_6ed543e2, styles.r_fc7473ca, styles.r_18550d59, styles.r_02eb621e)}>
              <p>描述品种、养护环境、浇水频率、光照时长和最近变化，结果会更准确。</p>
              <p>如果是病害问题，优先补充根部、叶片、盆土湿度和发病时间。</p>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>);

}

function AiAssistantPanel() {
  return (
    <section className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_a8f68dfb)}>
      <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258)}>AI 助手</h2>
        <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_e83a7042, styles.r_e7eab4cb)}>
          <span className={cx(styles.r_095acb27, styles.r_c696a089, styles.r_ac204c10, styles.r_6bceb016)} />
          在线
        </span>
      </div>
      <div className={styles.r_3e7ce58d}>
        <div className={cx(styles.r_fb56d9cf, styles.r_e6949e90, styles.r_68f2db62, styles.r_074f3c5b, styles.r_f2b23104, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_399e11a5)}>
          我的多肉叶片发软是什么原因?
          <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_1dc571a3, styles.r_7b89cd85)}>10:24</div>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
          <span className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_5f6a59f1)}>
            <Icon name="plants" size={17} />
          </span>
          <div className={cx(styles.r_68f2db62, styles.r_a172c008, styles.r_c1ebae4b, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_18550d59, styles.r_eb6abb1f)}>
            叶片发软通常和控水、根系、光照有关。先检查盆土是否长期湿润，再看根部有没有腐烂；如果最近暴晒，也可能是应激脱水。
            <div className={cx(styles.r_50d0d216, styles.r_1dc571a3, styles.r_7b89cd85)}>10:24</div>
          </div>
        </div>
      </div>
      <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_77a2a20e)}>
        {['浇水过多怎么办', '根系检查教程', '叶片发软建议'].map((item) =>
        <Link
          key={item}
          href={`/search?q=${encodeURIComponent(item)}`}
          className={cx(styles.r_a217b4ea, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_2efc423a)}>

            {item}
          </Link>
        )}
      </div>
      <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_508ebf85, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_438b2237)}>
        <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_66a36c90)}>继续问我植物养护问题...</span>
        <Link href="/search?q=多肉图片诊断" aria-label="上传图片" className={cx(styles.r_7b89cd85, styles.r_9825203a)}>
          <Icon name="image" size={17} />
        </Link>
        <Link href="/search?q=多肉拍照诊断" aria-label="拍照" className={cx(styles.r_7b89cd85, styles.r_9825203a)}>
          <Icon name="camera" size={17} />
        </Link>
        <Link href="/search?q=多肉养护问题" aria-label="发送" className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_ac204c10, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_e269e58c)}>
          <Icon name="send" size={15} />
        </Link>
      </div>
    </section>);

}