import { useEffect, useState } from "react";

function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      id="backToTop"
      className={`fixed bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
        isVisible ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={scrollToTop}
    >
      <i className="ri-arrow-up-line ri-lg"></i>
    </button>
  );
}

export default BackToTop;