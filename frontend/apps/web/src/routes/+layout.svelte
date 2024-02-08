<script>
	import '../app.postcss';
	export let data;
</script>

<!--div class="min-h-full"> </div-->
<div class="min-h-screen bg-slate-800">
	<nav class="navbar bg-base-100">
		<div class="flex-1">
			<a href="/" class="btn btn-ghost normal-case text-xl hover:font-semibold hover:text-white"
				>LOGIN TEST</a
			>
		</div>
		<div class="flex-none">
			{#if !data.user}
				<div class="dropdown dropdown-end">
					<a href="/login" class="btn btn-ghost normal-case hover:font-semibold hover:text-white"
						>Login</a
					>
					<a href="/register" class="btn btn-ghost normal-case hover:font-semibold hover:text-white"
						>Register</a
					>
				</div>
			{:else}
				<div class="dropdown dropdown-end mr-4">
					<form action="/logout" method="POST">
						<button
							type="submit"
							class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
							>Logout</button
						>
					</form>
				</div>
				<!--
				<div class="dropdown dropdown-end mr-4">
					<a
						href="/projects/new"
						class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
						>Add Project</a
					>
				</div>
				<div class="dropdown dropdown-bottom dropdown-end">
					<button
						aria-label="Click"
						class="btn m-1 btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
						tabindex="0">Menu</button
					>
					<ul class="dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-32">
						<li>
							<a
								href="/about"
								class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
								>Profile</a
							>
						</li>
						<li>
							<a
								href="/logsearch"
								class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
								>logsearch</a
							>
						</li>
						<li>
							<a
								href="/about"
								class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
								>About</a
							>
						</li>
						<li>
							<a
								href="/changelog"
								class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
								>Changelog</a
							>
						</li>
						<li>
							<form action="/logout" method="POST">
								<button
									type="submit"
									class="btn btn-ghost normal-case hover:cursor-pointer hover:font-semibold hover:text-white"
									>Logout</button
								>
							</form>
						</li>
					</ul>
				</div>
				-->
			{/if}
		</div>
	</nav>
	<div class="py-4">
		<div class="mx-auto px-0">
			<slot />
		</div>
	</div>
</div>
