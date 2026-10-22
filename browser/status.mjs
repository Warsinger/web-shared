// A late startup callback cannot erase an earlier runtime failure.
export function createStatus(element, {readyMessage = 'Ready.', errorMessage = error => String(error?.message || error)} = {}) {
  return {
    ready(message = readyMessage) {
      if (element.dataset.state === 'runtime-error') return false;
      element.dataset.state = 'ready'; element.textContent = message;
      return true;
    },
    fail(error) {
      element.dataset.state = 'runtime-error';
      element.textContent = typeof errorMessage === 'function' ? errorMessage(error) : errorMessage;
    }
  };
}
