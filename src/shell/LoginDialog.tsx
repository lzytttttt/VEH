import { useState } from 'react';
import { useAuthStore, TEACHER_USER, STUDENT_USER, ADMIN_USER, type AuthUser } from '../stores/authStore';
import ApiConfigPanel from '../components/ApiConfigPanel';

const ACCOUNTS: AuthUser[] = [TEACHER_USER, STUDENT_USER, ADMIN_USER];

const ROLE_LETTER: Record<AuthUser['role'], string> = { teacher: 'T', student: 'S', admin: 'A' };
const ROLE_DESC: Record<AuthUser['role'], string> = {
  teacher: '教学能力提升视角 · 教学反思 · 教师画像',
  student: '课堂知识回顾 · 在线学习 · 学情档案',
  admin: '学校治理驾驶舱 · 教务管理 · 年级分析',
};

function AccountCard({
  user,
  selected,
  onSelect,
}: {
  user: AuthUser;
  selected: boolean;
  onSelect: () => void;
}) {
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
        {ROLE_LETTER[user.role]}
      </div>
      <div className="flex-1">
        <div className="win-text win-text-bold" style={{ fontSize: '14px' }}>
          {user.name}
        </div>
        <div className="win-text" style={{ fontSize: '12px' }}>
          {user.title}
        </div>
        <div className="mt-1 win-text" style={{ fontSize: '11px', color: '#008080' }}>
          {ROLE_DESC[user.role]}
        </div>
      </div>
    </button>
  );
}

/** SSO 模拟认证进度对话框 */
const SSO_STEPS = [
  '连接认证服务器 (CAS)...',
  '验证 LDAP 凭证...',
  '获取组织角色信息...',
  '加载权限策略...',
];

function SSOProgressDialog({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // 推进进度
  if (step < SSO_STEPS.length) {
    setTimeout(() => {
      const next = step + 1;
      setStep(next);
      setProgress(Math.round((next / SSO_STEPS.length) * 100));
      if (next >= SSO_STEPS.length) {
        setTimeout(onDone, 400);
      }
    }, 600);
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)', zIndex: 50 }}>
      <div className="win-window" style={{ width: '360px' }}>
        <div className="win-titlebar" style={{ cursor: 'default' }}>
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: '12px' }}>🔐</span>
            <span>统一身份认证</span>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="win-text" style={{ fontSize: '12px' }}>正在通过学校统一身份认证(SSO)登录...</div>
          <div className="flex flex-col gap-1">
            {SSO_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2" style={{ fontSize: '11px' }}>
                <span style={{ color: i < step ? '#008000' : i === step ? '#000080' : '#808080' }}>
                  {i < step ? '✓' : i === step ? '▸' : '○'}
                </span>
                <span className={i <= step ? 'win-text' : ''} style={{ color: i <= step ? '#000' : '#808080' }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div className="win-sunken" style={{ height: '18px', padding: '2px' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #000080, #1084d0)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div className="win-text" style={{ fontSize: '11px', textAlign: 'right' }}>{progress}%</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginDialog() {
  const login = useAuthStore((s) => s.login);
  const [selected, setSelected] = useState<AuthUser | null>(TEACHER_USER);
  const [ssoActive, setSsoActive] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const handleOk = () => {
    if (selected) login(selected);
  };

  const handleSSO = () => {
    setSsoActive(true);
  };

  const handleSSODone = () => {
    setSsoActive(false);
    login(ADMIN_USER);
  };

  return (
    <div className="absolute inset-0 win-desktop-bg flex items-center justify-center animate-fade-in">
      {ssoActive && <SSOProgressDialog onDone={handleSSODone} />}
      {configOpen && <ApiConfigPanel onClose={() => setConfigOpen(false)} />}
      <div className="win-window" style={{ width: '520px' }}>
        {/* 标题栏 */}
        <div className="win-titlebar" style={{ cursor: 'default' }}>
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: '12px' }}>🔑</span>
            <span>登录到 VLM 教育赋能中枢</span>
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
              · 教师账户：场景分析 / 教师画像 / 教学反思 / 知识 WIKI 备课
              <br />· 学生账户：课堂回顾 / 学情档案 / 我的笔记 / 闯关学习
              <br />· 管理岗位：学校治理驾驶舱 / 教务管理 / 年级分析（AI Agent 洞察）
            </div>
          </div>

          {/* 按钮栏 */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <button
                className="win-button"
                onClick={handleSSO}
                style={{ minWidth: '120px' }}
                title="模拟学校统一身份认证(CAS/LDAP)登录"
              >
                🔐 统一身份认证(SSO)
              </button>
              <button
                className="win-button"
                onClick={() => setConfigOpen(true)}
                style={{ minWidth: '120px' }}
                title="图形化配置 VLM/LLM API 接入（6 个 Provider 独立切换）"
              >
                ⚙ API 接入设置
              </button>
            </div>
            <div className="flex gap-2">
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
    </div>
  );
}
