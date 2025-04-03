import { App, Editor, editorEditorField, MarkdownView, MetadataCache, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from 'obsidian';

interface WordCountPropertySettings {
	propertyName: string;
}

const DEFAULT_SETTINGS: WordCountPropertySettings = {
	propertyName: 'word_count'
}

export default class WordCountPropertyPlugin extends Plugin {
	settings: WordCountPropertySettings;

	private isRemoving = false;
	private activeLeaf: any;

	async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {

			this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return;
				let fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (fm && this.settings.propertyName in fm)
				{
					let text = await this.app.vault.read(file);
					let count = text.replace(/---[\S\s]*?---/, "").split(/\b\w+\b/g).length - 1; ///^---.*?\n---\n/s
					this.app.fileManager.processFrontMatter(file, async (frontmatter) => {frontmatter[this.settings.propertyName] = count});
				}
			}))
	
			// This adds an editor command that can perform some operation on the current editor instance
			this.addCommand({
				id: 'remove-tracked-property',
				name: 'Remove Tracked Property',
				editorCallback: (editor: Editor, view: MarkdownView) => {
					this.isRemoving = true;
					const file = this.app.workspace.getActiveFile();
					if (!file) return;
					this.app.fileManager.processFrontMatter(file, frontmatter => {delete frontmatter[this.settings.propertyName]});
				}
			});
			
			// This adds a settings tab so the user can configure various aspects of the plugin
			this.addSettingTab(new SettingTab(this.app, this));
		})
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: WordCountPropertyPlugin;

	constructor(app: App, plugin: WordCountPropertyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Property Name')
			.setDesc('Only notes with this property already added will be updated')
			.addText(text => text
				.setPlaceholder('word_count')
				.setValue(this.plugin.settings.propertyName)
				.onChange(async (value) => {
					this.plugin.settings.propertyName = value;
					await this.plugin.saveSettings();
				}));
	}
}
