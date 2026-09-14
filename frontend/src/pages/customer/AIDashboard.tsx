import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Zap,
  ChevronDown,
  BarChart3,
  Target,
  CheckCircle,
  RefreshCw,
  Info,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
  Legend,
  ComposedChart,
  Area,
} from 'recharts';
import api from '../../api/client';
import {
  MLDashboardResponse,
  MLProgressPrediction,
  MLRecommendation,
  MLInsightCard,
  MLPlateauInsight,
} from '../../types';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0D111A',
    borderColor: '#222D46',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
  },
};

// ── Confidence Gauge ─────────────────────────────────────────────────────────
const ConfidenceGauge: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? '#10b981' : pct >= 65 ? '#f59e0b' : '#f97316';
  const barW = `${pct}%`;

  return (
    <div className="flex items-center gap-3 mt-1">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: barW, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};

// ── Trend badge ──────────────────────────────────────────────────────────────
const TrendBadge: React.FC<{ trend: MLProgressPrediction['trend'] }> = ({ trend }) => {
  const map = {
    improving: { icon: <TrendingUp className="w-3 h-3" />, label: 'Improving', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    stagnant: { icon: <Minus className="w-3 h-3" />, label: 'Stagnant', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    declining: { icon: <TrendingDown className="w-3 h-3" />, label: 'Declining', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  };
  const t = map[trend];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${t.cls}`}>
      {t.icon}{t.label}
    </span>
  );
};

// ── Insight Card ─────────────────────────────────────────────────────────────
const InsightCard: React.FC<{ card: MLInsightCard }> = ({ card }) => {
  const severityBorder = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    caution: 'border-rose-500/30 bg-rose-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  }[card.severity] || 'border-white/10 bg-white/5';

  return (
    <div className={`p-4 rounded-2xl border ${severityBorder} flex gap-3`}>
      <span className="text-xl leading-none">{card.badge.split(' ')[0]}</span>
      <div>
        <div className="text-sm font-bold text-white">{card.title}</div>
        <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.description}</div>
      </div>
    </div>
  );
};

// ── Progress Chart ────────────────────────────────────────────────────────────
const PredictionChart: React.FC<{ prediction: MLProgressPrediction }> = ({ prediction }) => {
  if (!prediction.historical_points.length) return null;

  const chartData = prediction.historical_points.map((p) => ({
    ...p,
    type: 'historical',
    predicted_weight_kg: null as number | null,
  }));

  if (prediction.predicted_point) {
    chartData.push({
      ...prediction.predicted_point,
      weight_kg: null as unknown as number,
      predicted_weight_kg: prediction.predicted_point.weight_kg,
      type: 'predicted',
    });
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v: any, name: string) =>
          [`${Number(v).toFixed(1)} kg`, name === 'weight_kg' ? 'Historical' : 'AI Predicted']
        } />
        <Area
          dataKey="weight_kg"
          fill="#10b98110"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3 }}
          name="Historical"
          connectNulls={false}
        />
        <Line
          dataKey="predicted_weight_kg"
          stroke="#818cf8"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ fill: '#818cf8', r: 5 }}
          name="AI Predicted"
          connectNulls={false}
        />
        {prediction.predicted_point && (
          <ReferenceDot
            x={prediction.predicted_point.date}
            y={prediction.predicted_point.weight_kg}
            r={6}
            fill="#818cf8"
            stroke="#c7d2fe"
            strokeWidth={2}
            label={{ value: 'AI', fill: '#c7d2fe', fontSize: 9, dy: -10 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ── Prediction Card ───────────────────────────────────────────────────────────
const PredictionCard: React.FC<{
  prediction: MLProgressPrediction;
  recommendation?: MLRecommendation;
}> = ({ prediction, recommendation }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-dark-900 border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">{prediction.exercise_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <TrendBadge trend={prediction.trend} />
              {prediction.is_ml_prediction && (
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-2.5 h-2.5" /> ML Model
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400">Current → Predicted</div>
            <div className="text-sm font-bold text-white">
              {prediction.current_weight_kg} kg → <span className="text-indigo-400">{prediction.predicted_weight_kg} kg</span>
            </div>
            <div className="text-xs text-slate-500">{prediction.predicted_reps} reps</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[10px] text-slate-500 mb-0.5 uppercase font-semibold tracking-wide">Model Confidence</div>
          <ConfidenceGauge value={prediction.confidence} />
        </div>

        {/* Chart */}
        <div className="mt-4">
          <PredictionChart prediction={prediction} />
        </div>

        {/* Expand for explanation & recommendation */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition"
        >
          <span>Why this prediction?</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/6 p-5 space-y-4 bg-dark-950/40">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide mb-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" /> Explanation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{prediction.explanation}</p>
          </div>

          {recommendation && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
              <div className="text-[10px] text-indigo-400 uppercase font-semibold tracking-wide mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" /> Next Workout Recommendation
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white">
                    {recommendation.recommended_weight_kg} kg × {recommendation.recommended_reps_min}–{recommendation.recommended_reps_max} reps
                  </div>
                  <div className="text-xs text-slate-400">{recommendation.target_sets} sets</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                  recommendation.progression_type === 'conservative_increase'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                }`}>
                  {recommendation.progression_type === 'conservative_increase' ? '↑ Increase' : '= Maintain'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{recommendation.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Plateau Card ─────────────────────────────────────────────────────────────
const PlateauCard: React.FC<{ plateau: MLPlateauInsight }> = ({ plateau }) => (
  <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-5">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-amber-300 text-sm">{plateau.exercise_name}</div>
        <div className="text-xs text-amber-200/70 mt-1 leading-relaxed">{plateau.message}</div>
        <div className="mt-2 text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Suggestion: </span>
          {plateau.suggestion}
        </div>
      </div>
    </div>
  </div>
);

// ── Fatigue Banner ────────────────────────────────────────────────────────────
const FatigueBanner: React.FC<{ signal: MLDashboardResponse['fatigue_signal'] }> = ({ signal }) => {
  if (!signal.detected) return null;

  const bg =
    signal.severity === 'high' ? 'bg-rose-500/5 border-rose-500/25' :
    signal.severity === 'moderate' ? 'bg-orange-500/5 border-orange-500/25' :
    'bg-yellow-500/5 border-yellow-500/25';

  return (
    <div className={`border ${bg} rounded-2xl p-5 flex items-start gap-3`}>
      <Zap className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-orange-300 text-sm">Performance Fluctuation Signal</div>
        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{signal.message}</div>
        <div className="mt-1 text-xs text-slate-500">Severity: {signal.severity} · Drop: {signal.drop_percentage.toFixed(1)}%</div>
      </div>
    </div>
  );
};

// ── Insufficient Data State ───────────────────────────────────────────────────
const InsufficientDataState: React.FC<{
  count: number;
  required: number;
  recommendations: MLRecommendation[];
}> = ({ count, required, recommendations }) => (
  <div className="space-y-6">
    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 text-center">
      <Brain className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-80" />
      <h3 className="text-lg font-bold text-white">AI Insights Unlocking…</h3>
      <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
        You have completed <span className="text-indigo-300 font-semibold">{count}</span> workout session{count !== 1 ? 's' : ''}.
        Complete at least <span className="text-indigo-300 font-semibold">{required}</span> consistent sessions per exercise
        to unlock machine-learned progress predictions and overload recommendations.
      </p>
      <div className="mt-5 flex gap-2 justify-center">
        {Array.from({ length: required }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-2 rounded-full transition-all ${
              i < count ? 'bg-indigo-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">{Math.max(0, required - count)} more session{Math.max(0, required - count) !== 1 ? 's' : ''} to unlock full AI predictions</p>
    </div>

    {recommendations.length > 0 && (
      <div>
        <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Baseline Recommendations
        </h4>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div key={rec.exercise_id} className="bg-dark-900 border border-white/8 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-white text-sm">{rec.exercise_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {rec.recommended_weight_kg} kg × {rec.recommended_reps_min}–{rec.recommended_reps_max} reps · {rec.target_sets} sets
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  Rule-based
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{rec.reason}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── Main AI Dashboard Component ───────────────────────────────────────────────
export const AIDashboard: React.FC = () => {
  const [data, setData] = useState<MLDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'recommendations' | 'plateaus'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MLDashboardResponse>('/ml/progress');
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load AI insights.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'predictions', label: 'Predictions', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'recommendations', label: 'Next Workout', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'plateaus', label: 'Plateaus', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ] as const;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
        <span className="text-sm text-slate-400">Synthesizing AI insights…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-rose-300">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl flex items-center gap-2 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            AI Fitness Intelligence
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {data.data_sufficient
              ? `Machine-learned insights from ${data.completed_sessions_count} workout sessions`
              : `${data.completed_sessions_count} of ${data.min_sessions_required} sessions to unlock full AI`
            }
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-slate-400 hover:text-white transition"
          title="Refresh AI insights"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Insufficient Data */}
      {!data.data_sufficient && (
        <InsufficientDataState
          count={data.completed_sessions_count}
          required={data.min_sessions_required}
          recommendations={data.recommendations}
        />
      )}

      {/* Sufficient Data */}
      {data.data_sufficient && (
        <>
          {/* Tab nav */}
          <div className="flex gap-1 bg-dark-900 border border-white/8 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Fatigue banner — always show when detected */}
          {data.fatigue_signal.detected && <FatigueBanner signal={data.fatigue_signal} />}

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.insights.map(card => (
                  <InsightCard key={card.id} card={card} />
                ))}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-900 border border-white/8 rounded-2xl p-4 text-center">
                  <Activity className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{data.predictions.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Exercises Tracked</div>
                </div>
                <div className="bg-dark-900 border border-white/8 rounded-2xl p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">
                    {data.predictions.filter(p => p.trend === 'improving').length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Improving</div>
                </div>
                <div className="bg-dark-900 border border-white/8 rounded-2xl p-4 text-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{data.plateaus.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Plateaus</div>
                </div>
              </div>

              {/* Top prediction preview */}
              {data.predictions[0] && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Top Prediction</h4>
                  <PredictionCard
                    prediction={data.predictions[0]}
                    recommendation={data.recommendations.find(r => r.exercise_id === data.predictions[0].exercise_id)}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="space-y-4">
              {data.predictions.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No predictions available yet</p>
                </div>
              ) : (
                data.predictions.map(pred => (
                  <PredictionCard
                    key={pred.exercise_id}
                    prediction={pred}
                    recommendation={data.recommendations.find(r => r.exercise_id === pred.exercise_id)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {data.recommendations.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No recommendations available yet</p>
                </div>
              ) : (
                data.recommendations.map(rec => (
                  <div key={rec.exercise_id} className="bg-dark-900 border border-white/8 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{rec.exercise_name}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          {rec.is_ml_recommendation ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                              <Sparkles className="w-2.5 h-2.5" /> ML Rec
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full">
                              Rule-based
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                            rec.progression_type === 'conservative_increase'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                              : rec.progression_type === 'recovery'
                              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          }`}>
                            {rec.progression_type === 'conservative_increase' ? '↑ Increase' :
                             rec.progression_type === 'recovery' ? '♻ Recovery' : '= Maintain'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-white">{rec.recommended_weight_kg} kg</div>
                        <div className="text-xs text-slate-400">{rec.recommended_reps_min}–{rec.recommended_reps_max} reps · {rec.target_sets} sets</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] text-slate-500 mb-0.5 uppercase font-semibold tracking-wide">Confidence</div>
                      <ConfidenceGauge value={rec.confidence} />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">{rec.reason}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'plateaus' && (
            <div className="space-y-4">
              {data.plateaus.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No training plateaus detected — great variety!</p>
                </div>
              ) : (
                data.plateaus.map(plateau => (
                  <PlateauCard key={plateau.exercise_id} plateau={plateau} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
