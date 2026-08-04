import { useState } from 'react';
import { useAuthStore, TEACHER_USER, STUDENT_USER, type AuthUser } from '../stores/authStore';

const ACCOUNTS: AuthUser[] = [TEACHER_USER, STUDENT_USER];

function AccountCard({
  user,
  selected,
  onSelect,
}: {
  user: AuthUser;
  selected: boolean;
  onSelect: () => void;
}) {
  const isTeacher = user.role === 'teacher';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`win-raised text-left flex items-center gap-3 p-3 cursor-pointer w-full ${
        selected ? 'ring-2 ring-win-navy ring-inset' : ''
      }`}
      style={{ minWidth: '240px' }}
    >
      <div
        className="w-10 h-10 flex items-center justify-center text-white"
        style={{ background: user.avatarColor, fontWeight: 'bold', fontSize: '18px' }}
      >
        {isTeacher ? 'T' : 'S'}
      </div>
      <div className="flex-1">
        <div className="win-text win-text-bold" style={{ fontSize: '14px' }}>
          {user.name}
        </div>
        <div className="win-text" style={{ fontSize: '12px' }}>
          {user.title}
        </div>
        <div className="mt-1 win-text" style={{ fontSize: '11px', color: '#008080' }}>
          {isTeacher ? '教学能力提升视角 · 教学反思 · 教师画像' : '课堂知识回顾 · 在线学习 · 学情档案'}
        </div>
      </div>
    </button>
  );
}

export default function LoginDialog() {
  const login = useAuthStore((s) => s.login);
  const [selected, setSelected] = useState<AuthUser | null>(TEACHER_USER);

  const handleOk = () => {
    if (selected) login(selected);
  };

  return (
    <div className="absolute inset-0 win-desktop-bg flex items-center justify-center animate-fade-in">
      <div className="win-window" style={{ width: '480px' }}>
        {/* 标题栏 */}
        <div className="win-titlebar" style={{ cursor: 'default' }}>
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: '12px' }}>🔑</span>
            <span>登录到 VLM 课堂分析系统</span>
          </div>
          <button className="win-titlebar-btn" title="关闭" disabled style={{ opacity: 0.85 }}>
            <span className="win-glyph win-glyph-close" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-5 flex flex-col gap-4" style={{ marginTop: '2px' }}>
          <div className="win-text" style={{ fontSize: '13px' }}>
            欢迎使用。请选择登录账户：
          </div>

          <div className="flex flex-col gap-3">
            {ACCOUNTS.map((u) => (
              <AccountCard
                key={u.id}
                user={u}
                selected={selected?.id === u.id}
                onSelect={() => setSelected(u)}
              />
            ))}
          </div>

          <div className="win-fieldset" style={{ marginTop: '4px' }}>
            <legend>提示</legend>
            <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.5' }}>
              · 教师账户：场景分析（学生观察）/ 教师画像 / 教学反思 / 知识 WIKI 备课
              <br />· 学生账户：课堂回顾 / 学情档案 / 我的笔记 / 知识 WIKI + AI 助手
            </div>
          </div>

          {/* 按钮栏 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              className={`win-button ${selected ? 'is-default' : ''}`}
              onClick={handleOk}
              disabled={!selected}
              style={{ minWidth: '90px', fontWeight: 'bold' }}
            >
              确定
            </button>
            <button className="win-button" disabled style={{ minWidth: '90px' }}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
