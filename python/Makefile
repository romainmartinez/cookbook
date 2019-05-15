.PHONY: rm_conda install_conda install_jupyterlab install_jupyternb clean_install

#################################################################################
# GLOBALS                                                                       #
#################################################################################

SHELL=/bin/bash

#################################################################################
# PROJECT RULES                                                                 #
#################################################################################

## Remove Miniconda
rm_conda:
	rm -rf ~/miniconda* ~/.condarc ~/.conda ~/.continuum
	rm -rf ~/.local/share/jupyter/kernels/
	@echo "conda removed"

## Install Miniconda
install_conda:
	wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
	bash miniconda.sh -b -p ~/miniconda3
	rm miniconda.sh
	@echo "conda installed"

## Install Jupyterlab (with conda kernel, ToC and code formatter)
install_jupyterlab:
	conda install -y jupyterlab nb_conda_kernels black -c conda-forge
	pip install jupyterlab_code_formatter
	jupyter labextension install @ryantam626/jupyterlab_code_formatter @jupyterlab/toc
	jupyter serverextension enable --py jupyterlab_code_formatter
	@echo "jupyterlab installed"
	
install_jupyterlab_pre_release:
	pip install jupyterlab==1.0.0a3
	conda install -c conda-forge nb_conda_kernels

## Install Jupyter Notebook (with conda kernel, ToC, theme and code formatter)
install_jupyternb:
	conda install jupyter nb_conda_kernels jupyter_contrib_nbextensions yapf jupyterthemes -c conda-forge
	jt -t grade3 -fs 95  -tfs 13 -nfs 115 -cellw 88% -T -nf opensans -tf loraserif
	@echo "jupyter installed"

## Fresh conda & Jupyterlab install (run rm_conda, install_conda & install_jupyterlab)
fresh_install: rm_conda install_conda install_jupyterlab

#################################################################################
# Self Documenting Commands                                                     #
#################################################################################

.DEFAULT_GOAL := help

# Inspired by <http://marmelab.com/blog/2016/02/29/auto-documented-makefile.html>
# sed script explained:
# /^##/:
# 	* save line in hold space
# 	* purge line
# 	* Loop:
# 		* append newline + line to hold space
# 		* go to next line
# 		* if line starts with doc comment, strip comment character off and loop
# 	* remove target prerequisites
# 	* append hold space (+ newline) to line
# 	* replace newline plus comments by `---`
# 	* print line
# Separate expressions are necessary because labels cannot be delimited by
# semicolon; see <http://stackoverflow.com/a/11799865/1968>
.PHONY: help
help:
	@echo "$$(tput bold)Available rules:$$(tput sgr0)"
	@echo
	@sed -n -e "/^## / { \
		h; \
		s/.*//; \
		:doc" \
		-e "H; \
		n; \
		s/^## //; \
		t doc" \
		-e "s/:.*//; \
		G; \
		s/\\n## /---/; \
		s/\\n/ /g; \
		p; \
	}" ${MAKEFILE_LIST} \
	| LC_ALL='C' sort --ignore-case \
	| awk -F '---' \
		-v ncol=$$(tput cols) \
		-v indent=19 \
		-v col_on="$$(tput setaf 6)" \
		-v col_off="$$(tput sgr0)" \
	'{ \
		printf "%s%*s%s ", col_on, -indent, $$1, col_off; \
		n = split($$2, words, " "); \
		line_length = ncol - indent; \
		for (i = 1; i <= n; i++) { \
			line_length -= length(words[i]) + 1; \
			if (line_length <= 0) { \
				line_length = ncol - indent - length(words[i]) - 1; \
				printf "\n%*s ", -indent, " "; \
			} \
			printf "%s ", words[i]; \
		} \
		printf "\n"; \
	}' \
	| more $(shell test $(shell uname) = Darwin && echo '--no-init --raw-control-chars')
