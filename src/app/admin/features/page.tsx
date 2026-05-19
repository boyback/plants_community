'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';

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
      console.error('加载功能配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (key: string, enabled: boolean) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });

      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) => (f.key === key ? { ...f, enabled } : f))
        );
      } else {
        toast.error('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-leaf-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-leaf-900 mb-2">功能开关管理</h1>
          <p className="text-leaf-600">控制网站功能模块的开启和关闭</p>
        </div>

        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="bg-white border border-leaf-100 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-leaf-900 mb-1">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-leaf-600">{feature.description}</p>
                  <p className="text-xs text-leaf-400 mt-2 font-mono">{feature.key}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFeature(feature.key, !feature.enabled)}
                  disabled={saving === feature.key}
                  className={`
                    relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                    ${feature.enabled ? 'bg-leaf-500' : 'bg-leaf-200'}
                    ${saving === feature.key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform
                      ${feature.enabled ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Icon
                  name={feature.enabled ? 'check-circle' : 'x-circle'}
                  size={16}
                  className={feature.enabled ? 'text-leaf-600' : 'text-leaf-400'}
                />
                <span className={`text-sm ${feature.enabled ? 'text-leaf-600' : 'text-leaf-400'}`}>
                  {feature.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-leaf-50 border border-leaf-200 rounded-lg">
          <h4 className="text-sm font-semibold text-leaf-900 mb-2 flex items-center gap-2">
            <Icon name="info" size={16} />
            说明
          </h4>
          <ul className="text-sm text-leaf-700 space-y-1">
            <li>• 关闭功能后，对应的导航入口将自动隐藏</li>
            <li>• 用户仍可通过直接访问 URL 进入页面（如需完全禁止访问，需要在页面层面添加权限检查）</li>
            <li>• 配置修改后立即生效，无需重启服务</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
