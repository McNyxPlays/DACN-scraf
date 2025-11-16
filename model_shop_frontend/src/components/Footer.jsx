// src/components/Footer.jsx
function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <a
              href="#"
              className="text-3xl font-['Pacifico'] text-white mb-4 inline-block"
            >
              Scraptify
            </a>
            <p className="mb-4">
              Your one-stop destination for premium model kits, tools, and a
              thriving community of model enthusiasts.
            </p>
            <div className="flex gap-4">
              {[
                "ri-facebook-fill",
                "ri-twitter-x-fill",
                "ri-instagram-fill",
                "ri-youtube-fill",
              ].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-primary transition"
                >
                  <i className={icon}></i>
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Shop</h3>
            <ul className="space-y-2">
              {[
                "Gundam Kits",
                "Anime Figures",
                "DIY Models",
                "Tools & Paints",
                "New Arrivals",
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Account</h3>
            <ul className="space-y-2">
              {[
                "My Account",
                "Order History",
                "Wishlist",
                "My Posts",
                "Settings",
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Help</h3>
            <ul className="space-y-2">
              {[
                "FAQs",
                "Shipping Info",
                "Returns Policy",
                "Contact Us",
                "Privacy Policy",
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm mb-4 md:mb-0">
            © 2025 ModelMasters. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[
                "ri-visa-fill",
                "ri-mastercard-fill",
                "ri-paypal-fill",
                "ri-apple-fill",
              ].map((icon) => (
                <i key={icon} className={`${icon} ri-lg`}></i>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
