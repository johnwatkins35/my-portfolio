#!/bin/bash
cd /work || exit 1
echo
echo "LinLab sandbox"
echo "Type any Linux command. Help: man ls"
echo "Command list: cat ./commands.txt"
echo "Your files stay in /work."
echo "Packages you install with apt are deleted when you exit."
echo "Type exit to leave."
echo
exec bash
