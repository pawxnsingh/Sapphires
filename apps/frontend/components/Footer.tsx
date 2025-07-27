// components/Footer.tsx
export default function Footer() {
    const sections = [
      {
        title: 'Company',
        links: ['About Us', 'Blog', 'Careers'],
      },
      {
        title: 'Product',
        links: ['Roadmap', 'Status', 'Changelog', 'Pricing', 'Solutions', 'Hire a Partner', 'Become a Partner'],
      },
      {
        title: 'Resources',
        links: ['Launched', 'Enterprise', 'Learn →', 'Support', 'Integrations', 'Builder Hall of Fame', 'Affiliates'],
      },
      {
        title: 'Legal',
        links: ['Privacy Policy', 'Terms & Conditions', 'Report Abuse'],
      },
      {
        title: 'Socials',
        links: ['X / Twitter', 'LinkedIn', 'Discord', 'Reddit'],
      },
    ];
  
    return (
      <footer className="bg-white mt-16 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          {sections.map(sec => (
            <div key={sec.title}>
              <h3 className="text-sm font-semibold mb-4">{sec.title}</h3>
              <ul className="space-y-2">
                {sec.links.map(link => (
                  <li key={link}>
                    <a href="#" className="text-xs text-gray-600 hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    );
  }
  