import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Aggiorna lo state in modo che il prossimo render mostri l'UI di fallback
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log dell'errore per il debugging
        console.error('ErrorBoundary ha catturato un errore:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Ricarica la pagina per resettare completamente lo stato
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // UI di fallback personalizzata
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
                    <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border dark:border-gray-700">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-shrink-0">
                                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    Qualcosa è andato storto
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    Si è verificato un errore nell'applicazione
                                </p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                L'applicazione ha riscontrato un errore imprevisto. Puoi provare a:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>Ricarica la pagina</li>
                                <li>Controlla la console del browser per maggiori dettagli</li>
                                <li>Se il problema persiste, contatta il supporto</li>
                            </ul>
                        </div>

                        {this.state.error && (
                            <details className="mb-6">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Dettagli errore (clicca per espandere)
                                </summary>
                                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-mono text-red-600 dark:text-red-400 mb-2">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo && (
                                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-64">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Ricarica Applicazione
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Torna alla Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

