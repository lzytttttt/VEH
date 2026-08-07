import { useState } from 'react';

interface Props {
  onFeedback: (feedback: 'good' | 'bad', reason?: string) => void;
}

const BAD_REASONS = ['太短', '太泛', '不准确', '格式乱'];

/**
 * 用户反馈条 — 👍/👎 + 差评原因选择
 * 反馈写入 MemoryStore（由调用方处理），影响后续生成偏好。
 */
export default function FeedbackBar({ onFeedback }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [reason, setReason] = useState('');

  if (submitted) {
    return <span style={{ fontSize: '10px', color: '#808080' }}>✓ 已记录反馈</span>;
  }

  const submit = (fb: 'good' | 'bad', r?: string) => {
    onFeedback(fb, r);
    setSubmitted(true);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: '10px' }}>
      <span style={{ color: '#808080' }}>本次质量如何？</span>
      <button
        className="win-button"
        style={{ padding: '0 6px', fontSize: '11px' }}
        onClick={() => submit('good')}
        title="满意"
      >
        👍
      </button>
      <button
        className="win-button"
        style={{ padding: '0 6px', fontSize: '11px' }}
        onClick={() => setShowReasons(true)}
        title="不满意"
      >
        👎
      </button>
      {showReasons && (
        <div className="flex items-center gap-1 flex-wrap">
          {BAD_REASONS.map((r) => (
            <button
              key={r}
              className="win-button"
              style={{
                padding: '0 6px',
                fontSize: '10px',
                background: reason === r ? '#000080' : undefined,
                color: reason === r ? '#fff' : undefined,
              }}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
          <button
            className="win-button is-default"
            style={{ padding: '0 6px', fontSize: '10px' }}
            disabled={!reason}
            onClick={() => submit('bad', reason)}
          >
            提交
          </button>
        </div>
      )}
    </div>
  );
}
