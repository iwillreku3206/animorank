export interface Judge0SubmissionRequest {
	source_code?: string;
	language_id: number;
	stdin?: string;
	expected_output?: string;
	cpu_time_limit?: number;
	cpu_extra_time?: number;
	wall_time_limit?: number;
	memory_limit?: number;
	stack_limit?: number;
	max_processes_and_or_threads?: number;
	enable_per_process_and_thread_time_limit?: boolean;
	enable_per_process_and_thread_memory_limit?: boolean;
	max_file_size?: number;
	redirect_stderr_to_stdout?: boolean;
	number_of_runs?: number;
	additional_files?: string; // Base64 encoded ZIP
	callback_url?: string;
	compiler_options?: string;
}

export interface Judge0SubmissionResponse {
	stdout: string | null;
	stderr: string | null;
	compile_output: string | null;
	message: string | null;
	exit_code: number | null;
	exit_signal: number | null;
	status: Judge0Status;
	created_at: string; // ISO 8601
	finished_at: string | null;
	token: string;
	time: string | null; // Float as string
	wall_time: string | null;
	memory: number | null;
}

export interface Judge0SubmissionToken {
	token: string;
}

export interface Judge0Status {
	id: number;
	description: Judge0StatusDescription;
}

export type Judge0StatusDescription =
	| 'In Queue'
	| 'Processing'
	| 'Accepted'
	| 'Wrong Answer'
	| 'Time Limit Exceeded'
	| 'Compilation Error'
	| 'Runtime Error (SIGSEGV)'
	| 'Runtime Error (SIGXFSZ)'
	| 'Runtime Error (SIGFPE)'
	| 'Runtime Error (SIGABRT)'
	| 'Runtime Error (NZEC)'
	| 'Runtime Error (Other)'
	| 'Internal Error'
	| 'Exec Format Error';

// Helper enum for Status IDs
export enum Judge0StatusId {
	InQueue = 1,
	Processing = 2,
	Accepted = 3,
	WrongAnswer = 4,
	TimeLimitExceeded = 5,
	CompilationError = 6,
	RuntimeErrorSIGSEGV = 7,
	RuntimeErrorSIGXFSZ = 8,
	RuntimeErrorSIGFPE = 9,
	RuntimeErrorSIGABRT = 10,
	RuntimeErrorNZEC = 11,
	RuntimeErrorOther = 12,
	InternalError = 13,
	ExecFormatError = 14
}
