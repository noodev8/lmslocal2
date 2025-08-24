import { Link } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/20/solid';

export default function Landing() {
  return (
    <div className="bg-white">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <span className="text-2xl font-bold text-blue-600">LMSLocal</span>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#features" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
              Features
            </a>
            <a href="#pricing" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
              Pricing
            </a>
            <a href="#how-it-works" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
              How It Works
            </a>
          </div>
          <div className="flex lg:flex-1 lg:justify-end gap-x-4">
            <Link to="/login" className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600">
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-4xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Stop Wrestling with <span className="text-blue-600">Last Man Standing</span> Admin
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              The admin-first platform that makes running profitable Last Man Standing competitions 
              effortless for pub landlords, workplace organizers, and club managers. 
              <strong className="text-gray-900">5-minute setup. Zero headaches. More revenue.</strong>
            </p>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Start Free - Under 5 Players
              </Link>
              <a href="#how-it-works" className="text-lg font-semibold leading-6 text-gray-900 hover:text-blue-600">
                See How It Works <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-x-8 text-sm text-gray-500">
              <div className="flex items-center gap-x-2">
                <CheckIcon className="h-5 w-5 text-green-500" />
                <span>Free for competitions with 5 or fewer players</span>
              </div>
              <div className="flex items-center gap-x-2">
                <CheckIcon className="h-5 w-5 text-green-500" />
                <span>5-minute setup wizard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pain Points Section */}
      <div className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tired of Competition Admin Chaos?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              You know the drill. Endless WhatsApp messages, spreadsheet nightmares, and constant "who's picked?" questions. 
              There's got to be a better way.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  😤 "Has everyone picked yet?"
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Constantly chasing players for their picks. Checking who's in, who's out, who forgot to pick.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  📊 Spreadsheet Hell
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Managing results in Excel, calculating eliminations manually, and dealing with disputes over "what did I pick?"</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  💸 Lost Revenue
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Competitions fizzle out mid-season. Players lose interest. You're working harder but making less.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for Busy Organizers
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Every feature designed to reduce your workload while keeping players engaged and coming back.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600">
                    <span className="text-white font-bold">5m</span>
                  </div>
                  5-Minute Setup Wizard
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Competition name, team list, basic rules. Done. No complex configuration or tech headaches.</p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-green-600">
                    <span className="text-white font-bold">📱</span>
                  </div>
                  Manage Players Without Tech Stress
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Add players with just a name. Perfect for pub customers who don't have smartphones or email.</p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-600">
                    <span className="text-white font-bold">⚡</span>
                  </div>
                  Real-Time Status Dashboard
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">See who's picked, who hasn't, and when picks lock. No more "has everyone picked yet?" questions.</p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-600">
                    <span className="text-white font-bold">🔄</span>
                  </div>
                  Clone & Restart Magic
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Finished competition? One click to start the next season with the same players and settings.</p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-red-600">
                    <span className="text-white font-bold">🛡️</span>
                  </div>
                  Admin Override Powers
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Complete audit trail and override powers for handling disputes. You're in control, always.</p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold">📤</span>
                  </div>
                  One-Click Invitations
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Share a link or code. Players can join instantly. Bulk email invites for workplace competitions.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple Pricing That Works
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Start free with small competitions. Scale up when you're ready.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-3">
            {/* Free Tier */}
            <div className="rounded-3xl rounded-t-3xl bg-white/60 p-8 ring-1 ring-gray-900/10 sm:mx-8 sm:rounded-b-none sm:p-10 lg:mx-0 lg:rounded-bl-3xl lg:rounded-tr-none">
              <h3 className="text-base font-semibold leading-7 text-blue-600">Free</h3>
              <p className="mt-4 flex items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-gray-900">£0</span>
                <span className="text-base text-gray-500">per competition</span>
              </p>
              <p className="mt-6 text-base leading-7 text-gray-600">Perfect for testing the waters with small groups.</p>
              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Up to 5 players
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  All core features
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Email support
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-8 block rounded-md bg-blue-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Start Free
              </Link>
            </div>
            
            {/* Per Competition */}
            <div className="relative rounded-3xl bg-gray-900 p-8 shadow-2xl ring-1 ring-gray-900/10 sm:p-10">
              <h3 className="text-base font-semibold leading-7 text-gray-300">Per Competition</h3>
              <p className="mt-4 flex items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-white">£39</span>
                <span className="text-base text-gray-300">per competition</span>
              </p>
              <p className="mt-6 text-base leading-7 text-gray-300">Great for one-off events or seasonal competitions.</p>
              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-400" />
                  Unlimited players
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-400" />
                  All features included
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-400" />
                  Priority support
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-400" />
                  Custom branding
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-8 block rounded-md bg-white px-3.5 py-2.5 text-center text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
              >
                Get Started
              </Link>
            </div>
            
            {/* Monthly */}
            <div className="rounded-3xl rounded-b-3xl bg-white/60 p-8 ring-1 ring-gray-900/10 sm:mx-8 sm:rounded-t-none sm:p-10 lg:mx-0 lg:rounded-br-3xl lg:rounded-tl-none">
              <h3 className="text-base font-semibold leading-7 text-blue-600">Monthly</h3>
              <p className="mt-4 flex items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-gray-900">£19</span>
                <span className="text-base text-gray-500">per month</span>
              </p>
              <p className="mt-6 text-base leading-7 text-gray-600">Best for venues running multiple competitions.</p>
              <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Unlimited competitions
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Unlimited players
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Advanced analytics
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                  Phone support
                </li>
              </ul>
              <Link
                to="/register"
                className="mt-8 block rounded-md bg-blue-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Start Monthly
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Trusted by Organizers Everywhere
            </h2>
          </div>
          
          <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
            <div className="-mt-8 sm:-mx-4 sm:columns-2 sm:text-[0] lg:columns-3">
              <div className="pt-8 sm:inline-block sm:w-full sm:px-4">
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                  <blockquote className="text-gray-900">
                    <p>"Finally! No more chasing people on WhatsApp. Everything's automated and my punters love how easy it is to join."</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                      <span className="text-sm font-semibold">MJ</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Mark Johnson</div>
                      <div className="text-gray-600">The Red Lion, Manchester</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
              
              <div className="pt-8 sm:inline-block sm:w-full sm:px-4">
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                  <blockquote className="text-gray-900">
                    <p>"Set up our office competition in minutes. The clone feature means I'll never have to start from scratch again."</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                      <span className="text-sm font-semibold">SP</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Sarah Phillips</div>
                      <div className="text-gray-600">HR Manager, TechCorp</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
              
              <div className="pt-8 sm:inline-block sm:w-full sm:px-4">
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                  <blockquote className="text-gray-900">
                    <p>"Tripled our participation rates. The real-time dashboard keeps everyone engaged all season long."</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
                      <span className="text-sm font-semibold">DT</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Dave Thompson</div>
                      <div className="text-gray-600">Sports Club Secretary</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From Chaos to Competition in 5 Minutes
            </h2>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-2xl font-bold text-white">1</div>
                <dt className="text-base font-semibold leading-7 text-gray-900 mb-2">Quick Setup</dt>
                <dd className="text-sm leading-6 text-gray-600">Competition name, team list, basic rules. Our wizard guides you through everything.</dd>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-green-600 text-2xl font-bold text-white">2</div>
                <dt className="text-base font-semibold leading-7 text-gray-900 mb-2">Invite Players</dt>
                <dd className="text-sm leading-6 text-gray-600">Share a link or code. Add players manually. Bulk email for workplace competitions.</dd>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-purple-600 text-2xl font-bold text-white">3</div>
                <dt className="text-base font-semibold leading-7 text-gray-900 mb-2">Monitor & Manage</dt>
                <dd className="text-sm leading-6 text-gray-600">Real-time dashboard shows picks, results, and eliminations. Override anything when needed.</dd>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-orange-600 text-2xl font-bold text-white">4</div>
                <dt className="text-base font-semibold leading-7 text-gray-900 mb-2">Clone & Repeat</dt>
                <dd className="text-sm leading-6 text-gray-600">Finished? One click to start the next season. Same players, same settings, zero setup time.</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-blue-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to End Competition Admin Hell?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-blue-100">
              Join hundreds of organizers who've discovered the secret to effortless Last Man Standing competitions.
              Start free with competitions under 5 players.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-blue-600 shadow-sm hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Start Free Trial
              </Link>
              <Link to="/login" className="text-lg font-semibold leading-6 text-white hover:text-blue-100">
                Already have an account? <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <span className="text-sm leading-5 text-gray-500">
              © 2024 LMSLocal. Making competitions effortless.
            </span>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <span className="text-2xl font-bold text-blue-600">LMSLocal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}