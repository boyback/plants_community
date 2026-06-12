'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



interface FeatureConfig {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export default function FeatureManagementPage() {
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const res = await fetch('/api/admin/features');
      const data = await res.json();
      setFeatures(data);
    } catch (error) {
      console.error("加载功能配置失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ key, enabled })
      });

      if (res.ok) {
        setFeatures((prev) =>
        prev.map((f) => f.key === key ? { ...f, enabled } : f)
        );
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error("保存失败:", error);
      toast.error('保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_793346c7)}>
        <div className={styles.r_b17d6a13}>加载中...</div>
      </div>);

  }

  return (
    <div className={cx(styles.r_793346c7, styles.r_c1ebae4b, styles.r_845f5336)}>
      <div className={cx(styles.r_0e12dc7d, styles.r_cf3893e3)}>
        <div className={styles.r_a8b152c0}>
          <h1 className={cx(styles.r_751fb0d1, styles.r_69450ef1, styles.r_fa5fa43b, styles.r_a77ed4d9)}>功能开关管理</h1>
          <p className={styles.r_b17d6a13}>控制网站功能模块的开启和关闭</p>
        </div>

        <div className={styles.r_3e7ce58d}>
          {features.map((feature) =>
          <div
            key={feature.key}
            className={cx(styles.r_5e10cdb8, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0478c89a, styles.r_438b2237)}>

              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <div className={styles.r_36e579c0}>
                  <h3 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_fa5fa43b, styles.r_65281709)}>
                    {feature.name}
                  </h3>
                  <p className={cx(styles.r_fc7473ca, styles.r_b17d6a13)}>{feature.description}</p>
                  <p className={cx(styles.r_359090c2, styles.r_a4157fd5, styles.r_50d0d216, styles.r_0e65706b)}>{feature.key}</p>
                </div>

                <button
                type="button"
                onClick={() => toggleFeature(feature.key, !feature.enabled)}
                disabled={saving === feature.key}
                className={cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_ed8a5df7, styles.r_7e74e5fe, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ceb69a6b, `${

                feature.enabled ? styles.r_45499621 : styles.r_ae525718}
${saving === feature.key ? cx(styles.r_0b8c506a, styles.r_29b733e4) : styles.r_34516836}
`)}>

                  <span
                  className={cx(styles.r_bb0c4bfc, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_dd8ce13a, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_438b2237, styles.r_eadef238, `${

                  feature.enabled ? styles.r_82529ab8 : styles.r_c3ca6b52}
`)} />

                </button>
              </div>

              <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <Icon
                name={feature.enabled ? "check-circle" : "x-circle"}
                size={16}
                className={feature.enabled ? styles.r_b17d6a13 : styles.r_a4157fd5} />

                <span className={cx(styles.r_fc7473ca, `${feature.enabled ? styles.r_b17d6a13 : styles.r_a4157fd5}`)}>
                  {feature.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={cx(styles.r_4e5d2af5, styles.r_8e63407b, styles.r_7ebecbb6, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5f22e64f)}>
          <h4 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_fa5fa43b, styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <Icon name="info" size={16} />
            说明
          </h4>
          <ul className={cx(styles.r_fc7473ca, styles.r_5f6a59f1, styles.r_da7c36cd)}>
            <li>• 关闭功能后，对应的导航入口将自动隐藏</li>
            <li>• 用户仍可通过直接访问 URL 进入页面（如需完全禁止访问，需要在页面层面添加权限检查）</li>
            <li>• 配置修改后立即生效，无需重启服务</li>
          </ul>
        </div>
      </div>
    </div>);

}