<script>
	import { writable, derived } from 'svelte/store';
	import { onMount } from 'svelte';

	let file; // The selected file
	let uploading = false;
	const uploadPercentage = writable(0); // Using a writable store for reactivity
	let files = writable([]); // Store for the fetched files
	let fileInput; // Reference to the file input element

	const searchQuery = writable(''); // Store for the search query
	// Derived store to filter files based on search query
	const filteredFiles = derived([files, searchQuery], ([$files, $searchQuery]) =>
		$files.filter((file) => file.FileName.toLowerCase().includes($searchQuery.toLowerCase()))
	);

	// Refactored fetching logic into a function
	async function fetchFiles() {
		const response = await fetch('/api/getData');
		if (response.ok) {
			const result = await response.json();
			const parsedData = result.files.map((file) => ({
				...file,
				DiscordLink: JSON.parse(file.DiscordLink),
				FileSplitNames: JSON.parse(file.FileSplitNames)
			}));
			files.set(parsedData);
		} else {
			console.error('Failed to fetch files');
		}
	}

	onMount(() => {
		fetchFiles(); // Call it on component mount
	});

	async function uploadFile() {
		if (!file) return;

		const formData = new FormData();
		formData.append('file', file);

		uploading = true;
		uploadPercentage.set(0);

		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/upload');

		xhr.upload.onprogress = function (event) {
			if (event.lengthComputable) {
				const percentage = (event.loaded / event.total) * 100;
				uploadPercentage.set(percentage.toFixed(2));
			}
		};

		xhr.onload = async function () {
			if (xhr.status === 200) {
				console.log('Upload successful');
				await fetchFiles(); // Refresh the files list after successful upload
				console.log('table updated');
				if (fileInput) fileInput.value = ''; // Reset the file input
				file = null; // Reset the file variable
			} else {
				console.error('Upload failed with status:', xhr.status);
			}
			uploading = false;
		};

		xhr.onerror = function () {
			console.error('Error uploading file');
			uploading = false;
		};

		xhr.send(formData);
	}

	function handleFileChange(event) {
		file = event.target.files[0];
	}

	async function downloadFile(fileName, timeUploaded) {
		try {
			const response = await fetch(
				`/api/download?fileName=${encodeURIComponent(fileName)}&timeUploaded=${encodeURIComponent(
					timeUploaded
				)}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
			if (!response.ok) throw new Error('Failed to download file');

			// Assuming the server responds with the binary data of the reconstructed file
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName; // Set the file name for download
			document.body.appendChild(a); // Append to body to make it "clickable"
			a.click();
			a.remove(); // Clean up

			window.URL.revokeObjectURL(url); // Free up memory
		} catch (error) {
			console.error('Error downloading file:', error);
		}
	}
</script>

<!-- File Selection -->
<div class="flex flex-col items-center justify-center my-4">
	<input type="file" bind:this={fileInput} on:change={handleFileChange} class="mb-2" />

	<!-- Progress Bar -->
	{#if uploading}
		<progress value={$uploadPercentage} max="100" class="w-full mb-2"></progress>
		<p>Uploading: {$uploadPercentage}%</p>
	{/if}

	<!-- Upload Button -->
	<button
		on:click={uploadFile}
		disabled={uploading}
		class="btn bg-green-500 hover:bg-red-500 text-white py-2 px-4 rounded"
	>
		Upload File
	</button>

	<input
		type="text"
		placeholder="Type here"
		class="input input-bordered w-full max-w-xs mt-8"
		on:input={($event) => searchQuery.set($event.target.value)}
	/>
</div>

<!-- Table with white borders -->
<!-- Table with white borders -->
<div class="overflow-x-auto">
	<table class="table-auto w-full text-base sm:text-sm border-separate" style="border-spacing: 0;">
		<thead>
			<tr>
				<th class="border border-white">File Name</th>
				<th class="hidden sm:table-cell border border-white">Time Uploaded</th>
				<th class="hidden md:table-cell border border-white">File Size</th>
				<th class="border border-white">Discord Link(s)</th>
				<th class="hidden lg:table-cell border border-white">File Split Amount</th>
				<th class="border border-white">File Split Names</th>
				<th class="border border-white">Downloads</th>
				<!-- Added column for actions -->
			</tr>
		</thead>
		<tbody>
			{#each $filteredFiles as file}
				<tr class="hover:bg-slate-400">
					<td class="border border-white px-2 py-1">{file.FileName}</td>
					<td class="hidden sm:table-cell border border-white px-2 py-1">{file.TimeUploaded}</td>
					<td class="hidden md:table-cell border border-white px-2 py-1">{file.FileSize}</td>
					<td class="border border-white px-2 py-1">
						{#each file.DiscordLink as link}
							<div>
								<span class="text-lg font-bold">•</span>
								<a href={link} target="_blank" class="text-blue-500 hover:underline">{link}</a>
							</div>
						{/each}
					</td>
					<td class="hidden lg:table-cell border border-white px-2 py-1">{file.FileSplitAmount}</td>
					<td class="border border-white px-2 py-1">
						{#each file.FileSplitNames as name}
							<div><span class="text-lg font-bold">•</span> {name}</div>
						{/each}
					</td>
					<td class="border border-white px-2 py-1">
						<button
							on:click={() => downloadFile(file.FileName, file.TimeUploaded)}
							class="btn bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
						>
							Download
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
