.PHONY: rm_conda install_conda install_jupyterlab fresh_install

## Remove Miniconda
rm_conda:
	rm -rf ~/miniconda* ~/.condarc ~/.conda ~/.continuum
	rm -rf ~/.local/share/jupyter/kernels/

## Install Miniconda
install_conda:
	wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
	bash miniconda.sh -b -p ~/miniconda3
	rm miniconda.sh
	conda update conda -c conda-forge -y
	conda install -c conda-forge black pylint

## Install Jupyterlab (with conda kernel, ToC and code formatter)
install_jupyterlab:
	conda install -y jupyterlab nb_conda_kernels black nodejs -c conda-forge
	jupyter labextension install @jupyterlab/toc

## Fresh conda & Jupyterlab install (run rm_conda, install_conda & install_jupyterlab)
fresh_install: rm_conda install_conda install_jupyterlab
