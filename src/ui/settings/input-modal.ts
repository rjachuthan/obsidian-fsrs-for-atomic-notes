/**
 * InputModal - Simple text input modal
 * Used for getting user input in settings
 */

import { Modal, App, Setting } from "obsidian";

/**
 * Simple modal for text input
 */
export class InputModal extends Modal {
	private result: string = "";
	private placeholder: string;
	private title: string;
	private onSubmit: (result: string | null) => void;

	constructor(
		app: App,
		title: string,
		placeholder: string,
		onSubmit: (result: string | null) => void
	) {
		super(app);
		this.title = title;
		this.placeholder = placeholder;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl("h3", { text: this.title });

		new Setting(contentEl)
			.addText((text) =>
				text
					.setPlaceholder(this.placeholder)
					.onChange((value) => {
						this.result = value;
					})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Cancel")
					.onClick(() => {
						this.close();
						this.onSubmit(null);
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Add")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.result);
					})
			);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
