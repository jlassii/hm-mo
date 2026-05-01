'use client'

import { ArrowRight } from "lucide-react"
import { ParticleTextEffect } from "./particle-text-effect"
import { InfiniteSlider } from "./ui/infinite-slider"
import { ProgressiveBlur } from "./ui/progressive-blur"
import { handleQuickStart } from "./hero-section-action"

export function HeroSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden min-h-screen flex flex-col justify-between">
      <div className="flex items-start justify-center pt-16" style={{ minHeight: 'clamp(260px, 45vw, 420px)' }}>
        <ParticleTextEffect words={["مرشد", "قانون", "تونس", "قانون"]} />
      </div>

      <div className="container mx-auto text-center relative z-10 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <h2 dir="rtl" className="text-xl md:text-2xl font-bold text-white mb-4 max-w-3xl leading-relaxed">
              مُرشد هو <span dir="ltr" className="text-gray-400">Chat-GPT</span> القانون التونسي المخصّص لطلبة الحقوق
            </h2>
            <div dir="rtl" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-sm md:text-base font-medium text-gray-200">
                أكثر من <span className="text-white font-bold">+9000</span> طالب ومستخدم في تونس
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mt-2">
            <form action={handleQuickStart}>
              <button
                type="submit"
                className="inline-flex items-center gap-3 px-7 py-2.5 rounded-full font-bold text-base transition-all duration-150 hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#ef4444',
                  boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
                  direction: 'rtl'
                }}
              >
                <span>إبدأ الأن مجاناً، الكتابة بالأحرف العربية فقط !</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>

          <div className="mt-16 mb-8">
            <div className="group relative m-auto max-w-6xl">
              <div className="flex flex-col items-center md:flex-row">
                <div className="md:max-w-44 md:border-r md:border-gray-600 md:pr-6 mb-4 md:mb-0">
                  <p className="text-end text-sm text-white-400">لكافة جامعات القانون في تونس</p>
                </div>
                <div className="relative py-6 md:w-[calc(100%-11rem)]">
                  <InfiniteSlider durationOnHover={20} duration={40} gap={112}>
                    <div className="flex">
                      <img className="mx-auto h-17 w-fit invert opacity-150 hover:opacity-150 transition-opacity" src="./images/design-mode/2.svg" height="16" width="auto" />
                    </div>
                    <div className="flex">
                      <img className="mx-auto h-15 w-fit invert opacity-120 hover:opacity-120 transition-opacity" src="./images/design-mode/3.svg" height="16" width="auto" />
                    </div>
                    <div className="flex">
                      <img className="mx-auto h-15 w-fit invert opacity-150 hover:opacity-150 transition-opacity" src="./images/design-mode/4.svg" height="20" width="auto" />
                    </div>
                    <div className="flex">
                      <img className="mx-auto h-15 w-fit invert opacity-150 hover:opacity-150 transition-opacity" src="./images/design-mode/5.svg" height="16" width="auto" />
                    </div>
                    <div className="flex">
                      <img className="mx-auto h-15 w-fit invert opacity-150 hover:opacity-150 transition-opacity" src="./images/design-mode/6.svg" height="28" width="auto" />
                    </div>
                    <div className="flex">
                      <img className="mx-auto h-15 w-fit invert opacity-150 hover:opacity-150 transition-opacity" src="./images/design-mode/7.svg" height="240" width="auto" />
                    </div>
                  </InfiniteSlider>

                  <ProgressiveBlur
                    className="pointer-events-none absolute left-0 top-0 h-full w-20"
                    direction="left"
                    blurIntensity={1}
                  />
                  <ProgressiveBlur
                    className="pointer-events-none absolute right-0 top-0 h-full w-20"
                    direction="right"
                    blurIntensity={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
