'use client';

import Link from 'next/link';
import { CheckCircleIcon, TrophyIcon, UsersIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function LandingPage() {
  const features = [
    {
      title: '5-Minute Setup',
      description: 'Get your Last Man Standing competition running in minutes, not hours.',
      icon: ClockIcon,
    },
    {
      title: 'Admin-First Design',
      description: 'Built for pub landlords and organizers who need simple, powerful management tools.',
      icon: TrophyIcon,
    },
    {
      title: 'Player Management',
      description: 'Handle customers without smartphones or email. Add guest players effortlessly.',
      icon: UsersIcon,
    },
    {
      title: 'Complete Control',
      description: 'Override results, handle disputes, and manage everything with full audit trails.',
      icon: CheckCircleIcon,
    },
  ];

  const pricing = [
    {
      name: 'Free',
      price: '£0',
      period: 'forever',
      description: 'Perfect for small groups',
      features: [
        'Up to 5 players',
        'Basic competition management',
        'Email support',
        'Standard templates',
      ],
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Per Competition',
      price: '£39',
      period: 'per competition',
      description: 'Great for one-off events',
      features: [
        'Unlimited players',
        'Complete admin controls',
        'Priority support',
        'Custom branding',
        'Full audit trails',
      ],
      cta: 'Start Competition',
      highlighted: true,
    },
    {
      name: 'Monthly',
      price: '£19',
      period: 'per month',
      description: 'Best for regular organizers',
      features: [
        'Unlimited competitions',
        'Unlimited players',
        'Clone & restart feature',
        'Priority support',
        'Custom branding',
        'Advanced analytics',
      ],
      cta: 'Start Monthly',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrophyIcon className="h-8 w-8 text-green-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">LMSLocal</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
              <Link 
                href="/register" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Run Perfect Last Man Standing
            <span className="block text-green-600">Competitions Every Time</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The admin-first platform that makes running Last Man Standing competitions effortless for pub landlords, 
            workplace organizers, and club managers. Set up in 5 minutes, manage with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/register" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Start Your Free Competition
            </Link>
            <Link 
              href="#pricing" 
              className="text-green-600 hover:text-green-700 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-green-600 hover:bg-green-50 transition-all duration-200"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">Free for competitions with 5 players or less • No credit card required</p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for Busy Organizers
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stop spending hours managing competitions. Focus on your business while we handle the complexity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mb-4">
                    <Icon className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">Three simple steps to running professional competitions</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quick Setup</h3>
              <p className="text-gray-600">Name your competition, choose your teams (EPL included), set basic rules. Takes 5 minutes.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Invite Players</h3>
              <p className="text-gray-600">Share a simple link or access code. Add guest players for customers without smartphones.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 text-white rounded-full text-2xl font-bold mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage & Win</h3>
              <p className="text-gray-600">Track picks in real-time, handle disputes with override powers, let the system eliminate players automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">Choose the plan that works for your competitions</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, index) => (
              <div 
                key={index} 
                className={`rounded-lg p-8 ${
                  plan.highlighted 
                    ? 'bg-green-600 text-white ring-4 ring-green-600 ring-opacity-50 transform scale-105' 
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={`text-sm ${plan.highlighted ? 'text-green-100' : 'text-gray-500'}`}>
                      /{plan.period}
                    </span>
                  </div>
                  <p className={`mb-6 ${plan.highlighted ? 'text-green-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircleIcon className={`h-5 w-5 mr-2 ${plan.highlighted ? 'text-green-200' : 'text-green-600'}`} />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    href="/register" 
                    className={`block w-full py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 ${
                      plan.highlighted 
                        ? 'bg-white text-green-600 hover:bg-gray-100' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Competition?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of organizers who trust LMSLocal to run their Last Man Standing competitions.
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <TrophyIcon className="h-6 w-6 text-green-400 mr-2" />
              <span className="text-xl font-bold">LMSLocal</span>
            </div>
            <div className="text-sm text-gray-400 text-center md:text-right">
              <p>&copy; 2024 LMSLocal. All rights reserved.</p>
              <p className="mt-1">The admin-first Last Man Standing platform.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
