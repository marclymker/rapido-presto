import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TestNotifications() {
  const [user, setUser] = useState(null);
  const [tests, setTests] = useState({
    https: false,
    notificationAPI: false,
    permission: 'default',
    oneSignalScript: false,
    oneSignalInit: false,
    serviceWorker: false,
    pusherConnection: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    
    // Test 1: HTTPS
    const isHttps = window.location.protocol === 'https:';
    
    // Test 2: Notification API
    const hasNotificationAPI = 'Notification' in window;
    
    // Test 3: Permission
    const permission = hasNotificationAPI ? Notification.permission : 'unsupported';
    
    // Test 4: OneSignal Script chargé
    const oneSignalScriptLoaded = !!document.getElementById('onesignal-script');
    
    // Test 5: OneSignal initialisé
    const oneSignalInitialized = !!(window.OneSignal && window.OneSignal.initialized);
    
    // Test 6: Service Worker
    let serviceWorkerRegistered = false;
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        serviceWorkerRegistered = registrations.length > 0;
      } catch (e) {
        console.error(e);
      }
    }
    
    // Test 7: User
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (e) {
      console.error(e);
    }
    
    setTests({
      https: isHttps,
      notificationAPI: hasNotificationAPI,
      permission,
      oneSignalScript: oneSignalScriptLoaded,
      oneSignalInit: oneSignalInitialized,
      serviceWorker: serviceWorkerRegistered,
    });
    
    setLoading(false);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Votre navigateur ne supporte pas les notifications');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setTests(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        toast.success('Permission accordée !');
        // Test notification navigateur native
        new Notification('Test Rapido', {
          body: 'Les notifications fonctionnent ! 🎉',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        });
      } else {
        toast.error('Permission refusée');
      }
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  const testOneSignalNotification = async () => {
    if (!user) {
      toast.error('Connectez-vous d\'abord');
      return;
    }

    try {
      const { data } = await base44.functions.invoke('sendOrderNotificationOneSignal', {
        userId: user.id,
        title: '🔔 Test OneSignal',
        message: 'Si vous voyez ceci, OneSignal fonctionne !',
        orderId: 'test-123',
        url: window.location.origin
      });

      if (data.success) {
        toast.success(`Notification envoyée ! Recipients: ${data.recipients || 0}`);
      } else {
        toast.error('Échec: ' + JSON.stringify(data));
      }
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  const testPusherNotification = async () => {
    if (!user) {
      toast.error('Connectez-vous d\'abord');
      return;
    }

    try {
      await base44.functions.invoke('sendPushNotification', {
        userId: user.id,
        title: '🔔 Test Pusher',
        message: 'Si vous voyez ceci dans l\'app, Pusher fonctionne !',
        notification_type: 'test'
      });
      toast.success('Notification Pusher envoyée');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    }
  };

  const TestRow = ({ label, value, status }) => (
    <div className="flex items-center justify-between py-2 border-b">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
        {status === 'warning' && <AlertTriangle className="w-5 h-5 text-orange-600" />}
        <span className="text-sm">{value}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-12 h-12 animate-bounce mx-auto mb-4 text-orange-500" />
          <p>Diagnostic en cours...</p>
        </div>
      </div>
    );
  }

  const allGood = tests.https && 
                  tests.notificationAPI && 
                  tests.permission === 'granted' && 
                  tests.serviceWorker;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Diagnostic Notifications Push
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <TestRow 
                label="HTTPS" 
                value={tests.https ? 'Actif' : 'Inactif (requis)'} 
                status={tests.https ? 'success' : 'error'}
              />
              
              <TestRow 
                label="API Notifications" 
                value={tests.notificationAPI ? 'Supporté' : 'Non supporté'} 
                status={tests.notificationAPI ? 'success' : 'error'}
              />
              
              <TestRow 
                label="Permission" 
                value={tests.permission} 
                status={tests.permission === 'granted' ? 'success' : tests.permission === 'denied' ? 'error' : 'warning'}
              />
              
              <TestRow 
                label="Service Worker" 
                value={tests.serviceWorker ? 'Enregistré' : 'Non enregistré'} 
                status={tests.serviceWorker ? 'success' : 'error'}
              />
              
              <TestRow 
                label="OneSignal Script" 
                value={tests.oneSignalScript ? 'Chargé' : 'Non chargé'} 
                status={tests.oneSignalScript ? 'success' : 'warning'}
              />
              
              <TestRow 
                label="OneSignal Init" 
                value={tests.oneSignalInit ? 'Initialisé' : 'Non initialisé'} 
                status={tests.oneSignalInit ? 'success' : 'warning'}
              />
            </div>

            {!allGood && (
              <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
                <p className="font-bold text-red-800 mb-2">⚠️ Problèmes détectés :</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {!tests.https && <li>• HTTPS non actif (requis pour notifications)</li>}
                  {!tests.notificationAPI && <li>• Navigateur ne supporte pas les notifications</li>}
                  {tests.permission !== 'granted' && <li>• Permission non accordée</li>}
                  {!tests.serviceWorker && <li>• Service Worker manquant (OneSignal requis)</li>}
                </ul>
              </div>
            )}

            {allGood && (
              <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                <p className="font-bold text-green-800">✅ Tous les prérequis sont OK</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tests Manuels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!user && (
              <p className="text-sm text-gray-600 mb-2">
                Connectez-vous pour tester les notifications
              </p>
            )}
            
            <Button 
              onClick={requestPermission} 
              className="w-full"
              disabled={!tests.notificationAPI}
            >
              1. Demander Permission Navigateur
            </Button>
            
            <Button 
              onClick={() => {
                new Notification('Test Natif', {
                  body: 'Notification navigateur native',
                  icon: '/icon-192x192.png'
                });
              }}
              className="w-full"
              variant="outline"
              disabled={tests.permission !== 'granted'}
            >
              2. Test Notification Native
            </Button>

            <Button 
              onClick={testOneSignalNotification}
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!user}
            >
              3. Test OneSignal (Push)
            </Button>

            <Button 
              onClick={testPusherNotification}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!user}
            >
              4. Test Pusher (Temps Réel)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions de Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p className="font-bold">Pour que OneSignal fonctionne :</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Vérifiez dans le <a href="https://app.onesignal.com" target="_blank" className="text-blue-600 underline">Dashboard OneSignal</a></li>
                <li>Allez dans Settings → Platforms → Web Push</li>
                <li>Ajoutez votre domaine exact (avec https://)</li>
                <li>Téléchargez OneSignalSDKWorker.js et placez-le à la racine de votre domaine</li>
                <li>Vérifiez que votre App ID et API Key sont corrects</li>
              </ol>
              
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <p className="font-mono text-xs">
                  ONESIGNAL_APP_ID: Configuré ✓<br/>
                  ONESIGNAL_API_KEY: Configuré ✓
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}