const PieChart = ({ data }: { data: KeywordTypeItem[] }) => {
  const total = data.reduce((s, x) => s + x.percent, 0);
  let acc = 0;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto">
      <circle cx={100} cy={100} r={80} fill="#f3f4f6" />
      {data.map((d, i) => {
        const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
        const end = ((acc + d.percent) / total) * 2 * Math.PI - Math.PI / 2;
        acc += d.percent;
        const x1 = 100 + 80 * Math.cos(start);
        const y1 = 100 + 80 * Math.sin(start);
        const x2 = 100 + 80 * Math.cos(end);
        const y2 = 100 + 80 * Math.sin(end);
        const large = d.percent / total > 0.5 ? 1 : 0;
        const pathData = [
          'M', 100, 100,
          'L', x1, y1,
          'A', 80, 80, 0, large, 1, x2, y2,
          'Z'
        ].join(' ');
        return (
          <path
            key={i}
            d={pathData}
            fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][i]}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
};
