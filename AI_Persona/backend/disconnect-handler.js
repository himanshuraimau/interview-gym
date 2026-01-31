// Add this script right before the closing </body> tag in test.html

// Disconnect button handler
document.getElementById('disconnect-button').addEventListener('click', async () => {
    if (room) {
        await room.disconnect();
        room = null;

        // Reset UI
        const statusEl = document.getElementById('status');
        statusEl.className = 'status';
        statusEl.textContent = 'Disconnected';
        document.getElementById('setup-form').style.display = 'block';
        document.getElementById('controls').style.display = 'none';

        console.log('🔌 Disconnected from interview');
    }
});
