import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        dedupe: ['jiti'],
    },
    optimizeDeps: {
        include: ['jiti'],
    },
    build: {
        // Ottimizzazioni bundle
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    // Separazione vendor chunks ottimizzata
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'vendor-react';
                        }
                        if (id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
                            return 'vendor-markdown';
                        }
                        if (id.includes('@radix-ui') || id.includes('tailwindcss')) {
                            return 'vendor-ui';
                        }
                        return 'vendor-other';
                    }
                    // Code splitting per pagine grandi
                    if (id.includes('UpcomingEvents')) {
                        return 'page-events';
                    }
                    if (id.includes('MembersPage') || id.includes('CalendarPage')) {
                        return 'page-main';
                    }
                }
            }
        },
        // Code splitting
        chunkSizeWarningLimit: 600,
        sourcemap: false, // Disabilita sourcemaps in produzione
        // Compressione CSS e JS
        cssCodeSplit: true,
    },
    // CORS disattivate nel backend, proxy non necessario
    // server: {
    //     proxy: {
    //         '/api': {
    //             target: 'http://localhost:5000',
    //             changeOrigin: true,
    //             secure: false,
    //         }
    //     }
    // }
})

