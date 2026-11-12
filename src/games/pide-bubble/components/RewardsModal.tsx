import React, { useState } from 'react';
import { X, Gift, Check, Copy, Lock, Sparkles, Tag, Bike, Utensils, Zap, DollarSign, Crown } from 'lucide-react';
import { RewardCoupon } from '../types/game';

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: RewardCoupon[];
  maxUnlockedLevel: number;
  onApplyCouponToOrder: (coupon: RewardCoupon) => void;
  appliedCouponCode: string | null;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  isOpen,
  onClose,
  coupons,
  maxUnlockedLevel,
  onApplyCouponToOrder,
  appliedCouponCode,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCouponIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className="w-5 h-5 text-pink-400" />;
      case 'Bike':
        return <Bike className="w-5 h-5 text-cyan-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'DollarSign':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-yellow-400" />;
      default:
        return <Tag className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg game-glass-panel rounded-3xl p-6 border-2 border-pink-500/50 shadow-[0_0_40px_rgba(255,42,141,0.35)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-700/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Tus Recompensas</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full font-mono">
                  ACUMULABLES
                </span>
              </h2>
              <p className="text-xs text-purple-300">Supera niveles mientras esperas y descuenta dinero real de tu comida</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-900/60 rounded-full text-purple-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Coupons List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-3">
          {coupons.map(coupon => {
            const isUnlocked = coupon.unlocked || maxUnlockedLevel >= coupon.levelRequired;
            const isApplied = appliedCouponCode === coupon.code;

            return (
              <div
                key={coupon.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isApplied
                    ? 'bg-gradient-to-r from-emerald-950/70 to-purple-950/80 border-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.3)]'
                    : isUnlocked
                    ? 'bg-gradient-to-r from-purple-950/70 to-indigo-950/80 border-purple-500/50 hover:border-pink-500/60'
                    : 'bg-purple-950/30 border-purple-900/40 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left Icon & Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isUnlocked
                          ? 'bg-purple-900/80 border-purple-500/40'
                          : 'bg-purple-950/50 border-purple-800/30'
                      }`}
                    >
                      {isUnlocked ? (
                        getCouponIcon(coupon.iconName)
                      ) : (
                        <Lock className="w-5 h-5 text-purple-500" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {coupon.title}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                            isUnlocked
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-purple-900/40 text-purple-400'
                          }`}
                        >
                          {coupon.discountText}
                        </span>
                      </div>
                      <p className="text-xs text-purple-200 mt-1">
                        {coupon.description}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] font-mono text-purple-400">
                          CÓDIGO: <strong className="text-white">{coupon.code}</strong>
                        </span>
                        {isUnlocked && (
                          <button
                            onClick={() => handleCopy(coupon.code)}
                            className="p-1 hover:bg-purple-800/60 rounded text-purple-300 hover:text-white transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action: Apply to Order */}
                  <div className="shrink-0 text-right">
                    {isUnlocked ? (
                      isApplied ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1.5 rounded-xl border border-emerald-500/40">
                          <Check className="w-3.5 h-3.5" />
                          <span>Aplicado</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onApplyCouponToOrder(coupon)}
                          className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-xl text-xs font-bold text-white shadow-md transition-transform active:scale-95 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Aplicar</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-semibold text-purple-400/90 bg-purple-950/80 px-2 py-1 rounded-lg border border-purple-800/40">
                        Nivel {coupon.levelRequired} Req.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-purple-800/40 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 rounded-xl text-xs font-bold text-white shadow-lg transition-transform active:scale-98"
          >
            Entendido, seguir jugando
          </button>
        </div>
      </div>
    </div>
  );
};
