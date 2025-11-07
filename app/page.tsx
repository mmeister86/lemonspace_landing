import React from 'react'
import HeroSection from '@/components/hero-section'
import FeaturesSection from '@/components/features-8'
import FooterSection from '@/components/footer'
import CallToAction from '@/components/call-to-action'
import StatsSection from '@/components/stats'
import PricingSection from '@/components/pricing'

const page = () => {
  return (
    <>
     <HeroSection />  

     <FeaturesSection />
     <StatsSection />
     <PricingSection />
     <CallToAction />
     <FooterSection />
    </>
  )
}

export default page