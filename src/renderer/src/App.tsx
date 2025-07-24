import { useCallback, useEffect, useRef, useState } from 'react'
import { getIframeStyles } from './iframeStyles'
import './scss/App.scss'

declare global {
  interface HTMLIFrameElement {
    _styleObserver?: MutationObserver;
  }
}

function App(): React.JSX.Element {
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const [canGoBack, setCanGoBack] = useState(false)
	const [currentUrl, setCurrentUrl] = useState(
		'https://triviuminteractive.com'
	)
	const [isWebViewReady, setIsWebViewReady] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const historyStack = useRef<string[]>([])
	const currentIndex = useRef(-1)

	// Inside your App component, add this function
	const setupIframeStyles = (iframe: HTMLIFrameElement, baseUrl: string) => {
		try {
			if (!iframe.contentDocument) return

			// Create or update style element
			let style = iframe.contentDocument.getElementById(
				'external-link-styles'
			)
			if (!style) {
				style = iframe.contentDocument.createElement('style')
				style.id = 'external-link-styles'
				iframe.contentDocument.head.appendChild(style)
			}

			// Get the origin for the current URL
			let origin
			try {
				origin = new URL(baseUrl).origin
			} catch (e) {
				console.error('Invalid URL:', baseUrl)
				return
			}

			// Update styles
			style.textContent = getIframeStyles(origin)

			// Set up MutationObserver to reapply styles when DOM changes
			if (!iframe._styleObserver) {
				iframe._styleObserver = new MutationObserver((mutations) => {
					// Reapply styles when nodes are added
					if (mutations.some((m) => m.addedNodes.length > 0)) {
						setupIframeStyles(iframe, baseUrl)
					}
				})

				// Start observing the document
				iframe._styleObserver.observe(
					iframe.contentDocument.documentElement,
					{
						childList: true,
						subtree: true
					}
				)
			}
		} catch (err) {
			console.error('Error in setupIframeStyles:', err)
		}
	}

	// Handle back button click
	const handleGoBack = useCallback(() => {
		if (currentIndex.current > 0) {
			currentIndex.current--
			const prevUrl = historyStack.current[currentIndex.current]
			if (prevUrl && iframeRef.current) {
				iframeRef.current.src = prevUrl
				setCurrentUrl(prevUrl)
				setCanGoBack(currentIndex.current > 0)
			}
		}
	}, [])

	// Update navigation state when URL changes
	const updateNavigationState = useCallback(
		(newUrl: string, isBackNavigation = false) => {
			setCurrentUrl(newUrl)

			// Only update history stack if this is not a back navigation
			if (!isBackNavigation) {
				// If we're not at the end of the stack, truncate the stack
				if (currentIndex.current < historyStack.current.length - 1) {
					historyStack.current = historyStack.current.slice(
						0,
						currentIndex.current + 1
					)
				}
				historyStack.current.push(newUrl)
				currentIndex.current = historyStack.current.length - 1
			}

			setCanGoBack(currentIndex.current > 0)
		},
		[]
	)

	// Update your handleWebViewReady function
	const handleWebViewReady = useCallback(
		(e: React.SyntheticEvent<HTMLIFrameElement>) => {
			try {
				const iframe = e.target as HTMLIFrameElement
				const newUrl =
					iframe.src ||
					iframe.contentWindow?.location.href ||
					currentUrl

				// Setup iframe styles
				setupIframeStyles(iframe, newUrl)

				// Rest of your existing code...
				if (historyStack.current.length === 0) {
					historyStack.current = [newUrl]
					currentIndex.current = 0
				}

				if (newUrl !== currentUrl) {
					updateNavigationState(newUrl)
				}

				setIsWebViewReady(true)
				setError(null)
			} catch (err) {
				console.error('Error in handleWebViewReady:', err)
				setError('Failed to load page')
			}
		},
		[currentUrl, updateNavigationState]
	)

	// Update iframe configuration
	const iframeProps = {
		ref: iframeRef,
		src: currentUrl,
		onLoad: handleWebViewReady,
		onError: (e: React.SyntheticEvent<HTMLIFrameElement>) => {
			console.error('Error loading page:', e)
			setError('Failed to load page')
		},
		allow: '*',
		sandbox: 'allow-scripts allow-same-origin allow-forms'
	}

	// Add cleanup in a useEffect
	useEffect(() => {
		return () => {
			const iframe = iframeRef.current
			if (iframe?._styleObserver) {
				iframe._styleObserver.disconnect()
				delete iframe._styleObserver
			}
		}
	}, [])

	return (
		<div className="app">
			<div className="toolbar">
				<button
					className={`back-button ${!canGoBack ? 'disabled' : ''}`}
					disabled={!canGoBack}
					onClick={handleGoBack}
				>
					← Back
				</button>
			</div>
			<div className="webview-container">
				<iframe {...iframeProps} />
			</div>
		</div>
	)
}

export default App
