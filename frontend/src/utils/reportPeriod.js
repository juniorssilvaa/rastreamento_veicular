export function getReportPeriodRange(period, timeRange) {
  const now = new Date();
  const end = new Date(now);
  let start = new Date(now);

  switch (period) {
    case 'ontem':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
    case 'hoje':
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  if (timeRange === 'morning') {
    start.setHours(6, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
  } else if (timeRange === 'afternoon') {
    start.setHours(12, 0, 0, 0);
    end.setHours(18, 0, 0, 0);
  } else if (timeRange === 'night') {
    start.setHours(18, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export function formatReportDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatReportDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function runReportLoading(onProgress, minMs = 1200) {
  const started = Date.now();
  let finishResolve;

  const promise = new Promise((resolve) => {
    finishResolve = resolve;
  });

  const tick = () => {
    const elapsed = Date.now() - started;
    const progress = Math.min(92, Math.floor((elapsed / minMs) * 92));
    onProgress(progress);
    if (progress < 92) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);

  return {
    finish: async () => {
      const wait = Math.max(0, minMs - (Date.now() - started));
      await new Promise((resolve) => setTimeout(resolve, wait));
      onProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 350));
      finishResolve();
    },
    promise,
  };
}
