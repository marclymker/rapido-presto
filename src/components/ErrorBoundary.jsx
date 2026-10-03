import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erreur inattendue' };
  }

  componentDidCatch(error, info) {
    console.error('[Rapido Presto] Erreur d’interface:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 text-2xl">!</div>
          <h1 className="text-xl font-bold text-slate-900">Rapido Presto doit se reconnecter</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Une erreur d’affichage a été interceptée. Réessayez sans perdre votre compte.</p>
          <button type="button" onClick={this.handleRetry} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Réessayer</button>
          <p className="mt-4 break-words text-[11px] text-slate-400">{this.state.message}</p>
        </section>
      </main>
    );
  }
}
