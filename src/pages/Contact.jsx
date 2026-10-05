import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, MessageCircle, MapPin, Phone } from 'lucide-react';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message de ${form.name} via Kairos`);
    const body = encodeURIComponent(`Nom: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`);
    window.location.href = `mailto:support@makariosbridal.shop?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      <Helmet>
        <title>Contactez Kairos | Support & Questions</title>
        <meta name="description" content="Contactez l'équipe Kairos pour toute question, assistance ou partenariat. Disponibles par email, WhatsApp et sur les réseaux sociaux." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contactez-nous</h1>
        <p className="text-gray-500 mb-8">Notre équipe est disponible pour répondre à toutes vos questions.</p>

        {/* Coordonnées */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a href="mailto:support@makariosbridal.shop" className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Email</p>
              <p className="text-sm font-semibold text-gray-800">support@makariosbridal.shop</p>
            </div>
          </a>

          <a href="https://wa.me/50948690366" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">WhatsApp</p>
              <p className="text-sm font-semibold text-gray-800">+509 48 69 0366</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Localisation</p>
              <p className="text-sm font-semibold text-gray-800">Port-au-Prince, Haïti</p>
            </div>
          </div>

          <a href="https://facebook.com/rapidopresto" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Facebook</p>
              <p className="text-sm font-semibold text-gray-800">@rapidopresto</p>
            </div>
          </a>
        </div>

        {/* Formulaire */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Envoyer un message</h2>
          {sent ? (
            <p className="text-green-600 font-semibold text-sm">Merci ! Votre client email s'est ouvert. Nous vous répondrons sous 24h.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white resize-none"
                  placeholder="Comment pouvons-nous vous aider ?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition"
              >
                Envoyer le message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
