import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Phone, Mail, Calendar, ShoppingBag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '@/components/ui/ProductCard';
import { getClientPrice } from '@/components/utils/priceCalculation';

export default function AgentClients() {
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    event_type: 'Mariage',
    event_date: ''
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['agent-clients', user?.id],
    queryFn: () => base44.entities.AgentClient.filter({ agent_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true })
  });

  const makariosShop = shops.find(s => s.company_name?.toLowerCase().includes('makarios'));

  const { data: products = [] } = useQuery({
    queryKey: ['makarios-products'],
    queryFn: () => base44.entities.Product.filter({ 
      shop_id: makariosShop?.id,
      is_available: true 
    }),
    enabled: !!makariosShop?.id
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      return base44.entities.AgentClient.create(clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-clients']);
      toast.success('Client ajouté avec succès');
      setShowAddModal(false);
      setFormData({ full_name: '', phone: '', email: '', event_type: 'Mariage', event_date: '' });
      setSelectedProducts([]);
    }
  });

  const handleAddProduct = (product) => {
    const existing = selectedProducts.find(p => p.product_id === product.id);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => p.product_id === product.id 
          ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.unit_price }
          : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: 1,
        unit_price: getClientPrice(product),
        total: getClientPrice(product)
      }]);
    }
    toast.success('Produit ajouté au panier client');
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, p) => sum + p.total, 0);
  };

  const handleSubmit = () => {
    if (!formData.full_name || !formData.phone || !formData.event_type) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    const orderTotal = calculateTotal();
    const commissionAmount = orderTotal * 0.1;

    createClientMutation.mutate({
      agent_id: user.id,
      ...formData,
      order_items: selectedProducts,
      order_total: orderTotal,
      commission_amount: commissionAmount,
      status: 'En cours'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-black text-slate-900">Mes Clients</h1>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter Client
          </Button>
        </div>

        {/* Liste clients */}
        <div className="space-y-4">
          {clients.map(client => (
            <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg">{client.full_name}</h3>
                  <div className="flex flex-col gap-1 mt-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {client.event_type} {client.event_date && `- ${new Date(client.event_date).toLocaleDateString()}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <p className="text-xs text-slate-500">Montant</p>
                      <p className="font-black text-slate-900">{client.order_total?.toLocaleString()} HTG</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Commission (10%)</p>
                      <p className="font-black text-green-600">{client.commission_amount?.toLocaleString()} HTG</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    client.status === 'En cours' ? 'bg-blue-100 text-blue-700' :
                    client.status === 'Terminée' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {client.status}
                  </span>
                  {client.commission_claimed && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      Commission réclamée
                    </span>
                  )}
                </div>
              </div>

              {/* Articles */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  {client.order_items?.length || 0} article(s)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {client.order_items?.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-slate-50">
                      <img src={item.product_image} className="w-full h-full object-cover" alt="" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 text-center">
                        x{item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Ajout Client */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau client</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informations client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom complet *</Label>
                <Input 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+509 1234 5678"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label>Type d'événement *</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData({...formData, event_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mariage">Mariage</SelectItem>
                    <SelectItem value="Anniversaire">Anniversaire</SelectItem>
                    <SelectItem value="BabyShower">BabyShower</SelectItem>
                    <SelectItem value="Graduation">Graduation</SelectItem>
                    <SelectItem value="Communion">Communion</SelectItem>
                    <SelectItem value="Fête">Fête</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Date de l'événement</Label>
                <Input 
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                />
              </div>
            </div>

            {/* Panier */}
            <div className="border-t pt-4">
              <h3 className="font-bold mb-3">Panier Client ({selectedProducts.length} articles)</h3>
              {selectedProducts.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg mb-4 space-y-2">
                  {selectedProducts.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3 bg-white p-2 rounded">
                      <img src={item.product_image} className="w-12 h-12 object-cover rounded" alt="" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-slate-600">x{item.quantity} - {item.total.toLocaleString()} HTG</p>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        onClick={() => handleRemoveProduct(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total Commande:</span>
                      <span>{calculateTotal().toLocaleString()} HTG</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-bold text-sm">
                      <span>Commission (10%):</span>
                      <span>{(calculateTotal() * 0.1).toLocaleString()} HTG</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Catalogue produits */}
            <div>
              <h3 className="font-bold mb-3">Ajouter des produits</h3>
              <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {products.map(product => (
                  <div key={product.id} className="relative">
                    <ProductCard
                      product={product}
                      shop={makariosShop}
                      onAdd={() => handleAddProduct(product)}
                      onClick={() => handleAddProduct(product)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createClientMutation.isPending}
              >
                Enregistrer Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}