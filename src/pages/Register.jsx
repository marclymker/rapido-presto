import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, Mail, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPhoneNumber = (value) => {
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    return /^(\+?509)?[0-9]{8}$/.test(cleaned);
  };

  const formatPhoneToEmail = (phone) => {
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    const phoneNumber = cleaned.startsWith('509') ? cleaned : '509' + cleaned;
    return `${phoneNumber}@rapido.ht`;
  };

  const normalizePhoneNumber = (phone) => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+509')) return cleaned;
    if (cleaned.startsWith('509')) return '+' + cleaned;
    return '+509' + cleaned;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (password !== confirmPassword) {
      setError('Modpas yo pa menm');
      return;
    }

    if (password.length < 6) {
      setError('Modpas la dwe genyen omwen 6 karaktè');
      return;
    }

    setLoading(true);

    try {
      let emailToUse = identifier;
      let phoneToStore = '';
      let isPhoneRegistration = false;

      // Déterminer si c'est un téléphone ou email
      if (isPhoneNumber(identifier)) {
        isPhoneRegistration = true;
        emailToUse = formatPhoneToEmail(identifier);
        phoneToStore = normalizePhoneNumber(identifier);
      }

      // Créer le compte via l'API Base44
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          password: password,
          full_name: fullName
        })
      });

      if (response.ok) {
        // Login automatique après inscription
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToUse, password })
        });

        if (loginResponse.ok) {
          // Mettre à jour le profil avec le téléphone
          if (isPhoneRegistration) {
            await base44.auth.updateMe({
              phone: phoneToStore,
              current_profile: 'client',
              profiles: {
                client: { is_active: true, created_at: new Date().toISOString() }
              }
            });
          } else {
            await base44.auth.updateMe({
              current_profile: 'client',
              profiles: {
                client: { is_active: true, created_at: new Date().toISOString() }
              }
            });
          }

          window.location.href = '/';
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la création du compte');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Erreur de création de compte. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">RP</span>
          </div>
          <CardTitle className="text-2xl font-bold">Kreye Kont</CardTitle>
          <CardDescription>
            Enskri ak email oswa telefòn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Non Konplè</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Baptiste"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier">Email oswa Telefòn</Label>
              <div className="relative">
                <Input
                  id="identifier"
                  type="text"
                  placeholder="jean@gmail.com oswa +509 1234 5678"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  required
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {isPhoneNumber(identifier) ? (
                    <Phone className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
              </div>
              {isPhoneNumber(identifier) && (
                <p className="text-xs text-green-600">
                  ✓ Nimewo telefòn detekte: {normalizePhoneNumber(identifier)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Modpas</Label>
              <Input
                id="password"
                type="password"
                placeholder="Omwen 6 karaktè"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfime Modpas</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Tape modpas la ankò"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ap kreye kont...
                </>
              ) : (
                'Kreye Kont'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Ou deja gen yon kont? </span>
              <Link
                to={createPageUrl('Login')}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Konekte
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}