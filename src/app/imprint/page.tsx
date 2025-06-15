'use client'

import Link from 'next/link'
import { usePageTracking } from '@/hooks/usePageTracking'

export default function ImprintPage() {
  usePageTracking()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-[rgba(30,30,30,0.7)] backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl">
        <Link 
          href="/" 
          className="inline-flex items-center text-primary-500 hover:text-primary-400 mb-8 transition-colors"
        >
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-primary-500 to-primary-600 inline-block text-transparent bg-clip-text">
          Imprint
        </h1>
        
        <div className="space-y-6 text-white/80">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Information According to § 5 TMG</h2>
            <div className="space-y-2">
              <p>A-List ELAN Hub</p>
              <p>Levy Lowry</p>
              <p>123 Gaming Street</p>
              <p>10115 Berlin</p>
              <p>Germany</p>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <div className="space-y-2">
              <p>Email: contact@a-list-elan.com</p>
              <p>Discord: Levy#1234</p>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Responsible for Content</h2>
            <div className="space-y-2">
              <p>Levy Lowry</p>
              <p>123 Gaming Street</p>
              <p>10115 Berlin</p>
              <p>Germany</p>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Disclaimer</h2>
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white/90">Liability for Content</h3>
              <p>
                As a service provider, we are responsible for our own content on these pages according to general laws. 
                However, we are not obligated to monitor transmitted or stored third-party information or to investigate 
                circumstances that indicate illegal activity. Obligations to remove or block the use of information under 
                general laws remain unaffected. However, liability in this regard is only possible from the point in time 
                at which a concrete infringement of the law becomes known. If we become aware of any such infringements, 
                we will remove the relevant content immediately.
              </p>
              
              <h3 className="text-lg font-medium text-white/90 mt-4">Liability for Links</h3>
              <p>
                Our offer contains links to external websites of third parties, on whose contents we have no influence. 
                Therefore, we cannot assume any liability for these external contents. The respective provider or operator 
                of the pages is always responsible for the content of the linked pages. The linked pages were checked for 
                possible legal violations at the time of linking. Illegal contents were not recognizable at the time of 
                linking. However, a permanent control of the contents of the linked pages is not reasonable without concrete 
                evidence of a violation of law. If we become aware of any infringements, we will remove such links immediately.
              </p>
              
              <h3 className="text-lg font-medium text-white/90 mt-4">Copyright</h3>
              <p>
                The content and works created by the site operators on these pages are subject to German copyright law. 
                Duplication, processing, distribution, or any form of commercialization of such material beyond the scope 
                of the copyright law shall require the prior written consent of its respective author or creator. Downloads 
                and copies of this site are only permitted for private, non-commercial use. Insofar as the content on this 
                site was not created by the operator, the copyrights of third parties are respected. In particular, third-party 
                content is marked as such. Should you nevertheless become aware of a copyright infringement, please inform us 
                accordingly. If we become aware of any infringements, we will remove such content immediately.
              </p>
            </div>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Dispute Resolution</h2>
            <p>
              The European Commission provides a platform for online dispute resolution (OS): 
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400 ml-1">
                https://ec.europa.eu/consumers/odr/
              </a>
              <br />
              We are not willing or obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>
          
          <div className="pt-6 border-t border-white/10 text-white/60 text-sm">
            Last Updated: June 15, 2025
          </div>
        </div>
      </div>
    </div>
  )
}