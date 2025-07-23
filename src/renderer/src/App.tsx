import { useCallback, useEffect, useRef, useState } from 'react'
import './scss/App.scss'

// Type definitions for Electron webview
declare global {
	interface Window {
		electron: {
			webview: {
				goBack: () => Promise<void>
				canGoBack: () => Promise<boolean>
				getURL: () => Promise<string>
			}
		}
	}
}

// Create a type for the webview element with our custom methods
type ElectronWebView = Electron.WebViewTag

function App(): React.JSX.Element {
	const webviewRef = useRef<ElectronWebView>(null)
	const [canGoBack, setCanGoBack] = useState(false)
	const [currentUrl, setCurrentUrl] = useState(
		'https://triviuminteractive.com'
	)
	const [isWebViewReady, setIsWebViewReady] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Update navigation state
	const updateNavigationState = useCallback(async () => {
		const webview = webviewRef.current
		if (!webview || !isWebViewReady) return

		try {
			// Use type assertion to access the webview methods
			const webviewElement = webview as unknown as ElectronWebView

			// Check if the webview has the executeJavaScript method
			if (typeof webviewElement.executeJavaScript === 'function') {
				const [url, canGoBack] = await Promise.all([
					webviewElement.executeJavaScript<string>(
						'window.location.href'
					),
					webviewElement.executeJavaScript<boolean>(
						'window.history.length > 1'
					)
				])

				setCurrentUrl(url || currentUrl)
				setCanGoBack(canGoBack)
			} else {
				// Fallback to using the URL from the webview if executeJavaScript is not available
				const url = webviewElement.getURL
					? webviewElement.getURL()
					: currentUrl
				setCurrentUrl(url)
				setCanGoBack(
					webviewElement.canGoBack
						? webviewElement.canGoBack()
						: false
				)
			}
		} catch (error) {
			console.error('Error updating navigation state:', error)
		}
	}, [currentUrl, isWebViewReady])

	// Handle back button click
	const handleGoBack = useCallback(async () => {
		const webview = webviewRef.current
		if (!webview || !isWebViewReady) return

		try {
			const webviewElement = webview as unknown as ElectronWebView

			if (typeof webviewElement.executeJavaScript === 'function') {
				await webviewElement.executeJavaScript('window.history.back()')
			} else if (typeof webviewElement.goBack === 'function') {
				webviewElement.goBack()
			}
			// The navigation events will trigger updateNavigationState
		} catch (error) {
			console.error('Error going back:', error)
		}
	}, [isWebViewReady])

	// Handle standard HTML error event
	const handleStandardError = useCallback(
		(event: React.SyntheticEvent<HTMLWebViewElement, Event>) => {
			console.error('WebView error:', event)
			setError('An error occurred while loading the page')
		},
		[]
	)

	// Handle webview ready state
	const handleWebViewReady = useCallback(() => {
		console.log('WebView is ready')
		setIsWebViewReady(true)
		setError(null)
		updateNavigationState()
	}, [updateNavigationState])

	// Set up event listeners
	useEffect(() => {
		const webview = webviewRef.current
		if (!webview) return

		const handleLoad = () => updateNavigationState()

		// Add event listeners with proper typing
		const webviewElement = webview as unknown as ElectronWebView

		// Add event listeners with proper typing
		webviewElement.addEventListener('dom-ready', handleWebViewReady)
		webviewElement.addEventListener('did-navigate', handleLoad)
		webviewElement.addEventListener('did-navigate-in-page', handleLoad)
		webviewElement.addEventListener('did-stop-loading', handleLoad)

		// Initial check after a short delay to ensure the webview is ready
		const initTimer = setTimeout(() => {
			if (!isWebViewReady) {
				console.log('Initial webview state check')
				updateNavigationState()
			}
		}, 1000)

		// Cleanup
		return () => {
			webviewElement.removeEventListener('dom-ready', handleWebViewReady)
			webviewElement.removeEventListener('did-navigate', handleLoad)
			webviewElement.removeEventListener(
				'did-navigate-in-page',
				handleLoad
			)
			webviewElement.removeEventListener('did-stop-loading', handleLoad)
			clearTimeout(initTimer)
		}
	}, [updateNavigationState, handleWebViewReady, isWebViewReady])

	return (
		<div className="app">
			<div className="navigation-bar">
				<button
					className={`back-button ${!canGoBack ? 'disabled' : ''}`}
					disabled={!canGoBack}
					onClick={handleGoBack}
				>
					← Back
				</button>
				<div className="url-display">{currentUrl}</div>
			</div>
			<div className="webview-container">
				{error ? (
					<div className="error-message">
						<p>Error loading page: {error}</p>
						<button onClick={() => window.location.reload()}>
							Reload
						</button>
					</div>
				) : (
					<>
						{/* Using type assertion for custom Electron webview events */}
						<webview
							ref={webviewRef}
							src={currentUrl}
							onError={handleStandardError}
							webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
							nodeintegration={false}
							disablewebsecurity={false}
							// partition="persist:trivium-view"
						/>
					</>
				)}
			</div>
		</div>
	)
}

export default App
