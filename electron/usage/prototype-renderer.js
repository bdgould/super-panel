for (const section of document.querySelectorAll('[data-provider]')) {
  for (const button of section.querySelectorAll('button')) {
    button.addEventListener('click', async () => {
      const buttons = section.querySelectorAll('button');
      buttons.forEach(control => { control.disabled = true; });
      const status = section.querySelector('.status');
      status.textContent = 'Working…';
      try {
        const result = await window.usagePrototype.action(section.dataset.provider, button.dataset.action,
          section.querySelector('select')?.value || null);
        if (!result.success) { status.textContent = result.error.message; return; }
        status.textContent = button.dataset.action === 'connect' ? 'Complete sign-in, then click Read usage.'
          : button.dataset.action === 'disconnect' ? 'Disconnected' : 'Request completed';
        section.querySelector('pre').textContent = result.snapshot ? JSON.stringify(result.snapshot, null, 2) : '';
        if (result.snapshot?.needsOrganization) {
          const select = section.querySelector('select');
          select.replaceChildren(...result.snapshot.organizations.map(org => {
            const option = document.createElement('option'); option.value = org.id; option.textContent = org.label; return option;
          }));
          section.querySelector('label').hidden = false;
          status.textContent = 'Choose a workspace, then read usage again.';
        }
      } catch { status.textContent = 'Connection test failed. Try again.'; }
      finally { buttons.forEach(control => { control.disabled = false; }); }
    });
  }
}
window.usagePrototype.onNotice(message => { document.getElementById('notice').textContent = message; });
