import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = memo(function Footer() {
  const { t } = useTranslation();

  const categories = [
    [t("footer.importedFruit"), "/products?cat=nhap-khau"],
    [t("footer.domesticFruit"), "/products?cat=trong-nuoc"],
    [t("footer.organicFruit"), "/products?cat=huu-co"],
    [t("footer.giftBaskets"), "/products?cat=gio-qua"],
    [t("footer.driedFruit"), "/products?cat=say-kho"],
  ] as const;

  const supportLinks = [
    t("footer.shippingPolicy"),
    t("footer.returnPolicy"),
    t("footer.faq"),
    t("footer.guide"),
    t("footer.contactLink"),
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t("footer.contact")}
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">📍</span>
                <span>{t("footer.address")}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>📞</span>
                <a href="tel:1800xxxx" className="hover:text-green-400">
                  {t("footer.phone")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>✉️</span>
                <a
                  href="mailto:hello@morningfruit.vn"
                  className="hover:text-green-400"
                >
                  {t("footer.email")}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span>🕐</span>
                <span>{t("footer.hours")}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
