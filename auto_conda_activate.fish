function auto_activate_conda --on-variable PWD
    if test -f environment.yml
        set env_name (awk '/name:/ {print $2; exit}' environment.yml)
        if test -n "$env_name"
            conda activate $env_name
            echo -e (set_color green)"✅ Activated Conda environment: $env_name"(set_color normal)
            set -g last_conda_env_dir $PWD
        end
    else
        if test -n "$last_conda_env_dir"; and test $PWD != $last_conda_env_dir
            conda deactivate
            echo -e (set_color red)"❌ Deactivated Conda environment"(set_color normal)
            set -e last_conda_env_dir
        end
    end
end
