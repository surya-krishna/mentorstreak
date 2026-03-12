import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  // Minimal modal implementation for confirm/prompt/alert; uses native prompt/confirm if DOM operations fail.

  async confirm(message: string): Promise<boolean> {
    try {
      return await new Promise<boolean>((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.left = '0';
        backdrop.style.top = '0';
        backdrop.style.right = '0';
        backdrop.style.bottom = '0';
        backdrop.style.background = 'rgba(0,0,0,0.4)';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.zIndex = '100000';

        const box = document.createElement('div');
        box.style.background = 'white';
        box.style.padding = '16px';
        box.style.borderRadius = '8px';
        box.style.maxWidth = '480px';
        box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';

        const msg = document.createElement('div');
        msg.style.marginBottom = '12px';
        msg.style.color = '#111';
        msg.textContent = message;

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '8px';

        const no = document.createElement('button');
        no.textContent = 'Cancel';
        no.onclick = () => { backdrop.remove(); resolve(false); };
        no.style.padding = '6px 10px';

        const yes = document.createElement('button');
        yes.textContent = 'OK';
        yes.onclick = () => { backdrop.remove(); resolve(true); };
        yes.style.padding = '6px 10px';
        yes.style.background = '#2563eb';
        yes.style.color = 'white';
        yes.style.border = 'none';
        yes.style.borderRadius = '4px';

        actions.appendChild(no);
        actions.appendChild(yes);
        box.appendChild(msg);
        box.appendChild(actions);
        backdrop.appendChild(box);
        document.body.appendChild(backdrop);
      });
    } catch (e) {
      return window.confirm(message);
    }
  }

  async prompt(message: string, defaultValue = ''): Promise<string | null> {
    try {
      return await new Promise<string | null>((resolve) => {
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.left = '0';
        backdrop.style.top = '0';
        backdrop.style.right = '0';
        backdrop.style.bottom = '0';
        backdrop.style.background = 'rgba(0,0,0,0.4)';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.zIndex = '100000';

        const box = document.createElement('div');
        box.style.background = 'white';
        box.style.padding = '16px';
        box.style.borderRadius = '8px';
        box.style.maxWidth = '480px';

        const msg = document.createElement('div');
        msg.style.marginBottom = '12px';
        msg.style.color = '#111';
        msg.textContent = message;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.style.width = '100%';
        input.style.marginBottom = '12px';
        input.style.padding = '8px';
        input.style.color = '#000'

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '8px';

        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.onclick = () => { backdrop.remove(); resolve(null); };
        cancel.style.padding = '6px 10px';

        const ok = document.createElement('button');
        ok.textContent = 'OK';
        ok.onclick = () => { const v = input.value; backdrop.remove(); resolve(v); };
        ok.style.padding = '6px 10px';
        ok.style.background = '#2563eb';
        ok.style.color = 'white';
        ok.style.border = 'none';
        ok.style.borderRadius = '4px';

        actions.appendChild(cancel);
        actions.appendChild(ok);
        box.appendChild(msg);
        box.appendChild(input);
        box.appendChild(actions);
        backdrop.appendChild(box);
        document.body.appendChild(backdrop);
        input.focus();
      });
    } catch (e) {
      return window.prompt(message, defaultValue);
    }
  }

  alert(message: string) {
    try { window.alert(message); } catch (e) { /* ignore */ }
  }
}
