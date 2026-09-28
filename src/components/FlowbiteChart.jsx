import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../context/ThemeContext.jsx';

function FlowbiteChart({ options, series, height = 280, className = '', ariaLabel }) {
  const chartElementRef = useRef(null);
  const [ApexChartsConstructor, setApexChartsConstructor] = useState(null);

  useEffect(() => {
    let active = true;
    import('apexcharts')
      .then(({ default: ApexCharts }) => {
        if (active) setApexChartsConstructor(() => ApexCharts);
      })
      .catch(() => {
        // The surrounding page keeps its data and accessible summary if the chart chunk fails.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ApexChartsConstructor || !chartElementRef.current) return undefined;

    const chart = new ApexChartsConstructor(chartElementRef.current, {
      ...options,
      chart: {
        ...options.chart,
        height,
      },
      series,
    });

    chart.render();

    return () => {
      chart.destroy();
    };
  }, [ApexChartsConstructor, ariaLabel, className, height, options, series]);

  return (
    <div
      ref={chartElementRef}
      className={`op-flowbite-chart ${className}`.trim()}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    />
  );
}

FlowbiteChart.propTypes = {
  options: PropTypes.object.isRequired,
  series: PropTypes.array.isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

function FlowbiteGauge({ label, value, note, color = '#C49A6C', height = 150 }) {
  const { isDark } = useTheme();
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  const displayValue = Number.isInteger(safeValue) ? safeValue : safeValue.toFixed(1);
  const trackColor = isDark ? '#26364F' : '#E8EDF7';
  const resolvedColor = isDark ? ({
    '#0B1F42': '#8FB4FF',
    '#3F8F62': '#69C98A',
    '#C49A6C': '#E3B987',
    '#C85C52': '#E47C72',
  }[color] || color) : color;
  const options = useMemo(() => ({
    chart: {
      type: 'radialBar',
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: true, speed: 500 },
      fontFamily: 'Inter, Arial, sans-serif',
    },
    colors: [resolvedColor],
    labels: [label],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: trackColor, strokeWidth: '100%' },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 7,
            color: isDark ? '#F8FAFC' : '#0B1F42',
            fontSize: '22px',
            fontFamily: 'Montserrat, Arial, sans-serif',
            fontWeight: 700,
            formatter: () => `${displayValue}%`,
          },
        },
      },
    },
    fill: { type: 'solid', opacity: 1 },
    stroke: { lineCap: 'round' },
  }), [displayValue, isDark, label, resolvedColor, trackColor]);

  return (
    <article className="op-flowbite-gauge">
      <FlowbiteChart
        options={options}
        series={[safeValue]}
        height={height}
        ariaLabel={`${label}: ${displayValue}%`}
      />
      <strong>{label}</strong>
      <span>{note}</span>
    </article>
  );
}

FlowbiteGauge.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  note: PropTypes.string.isRequired,
  color: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export { FlowbiteGauge };
export default FlowbiteChart;
